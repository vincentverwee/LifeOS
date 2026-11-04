"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTodayKey } from "@/lib/today";
import { knownError } from "@/lib/prismaErrors";
import { dayKey, parseAmount, parseDateKey } from "@/lib/format";
import { readPhoto } from "@/lib/images/upload";
import { isStatus, isWashGroup, LEGACY_WASH_SOURCE, WASH_ROUTINE_NAME, WASH_ROUTINE_SOURCE, type ClothingStatus, type WashGroup } from "@/lib/wardrobe/types";
import type { Prisma } from "@/generated/prisma/client";

export type WardrobeFormState = { ok: true } | { ok: false; error: string } | null;

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/wardrobe", "layout");
}

/** A wash also changes Last done. */
function revalidateWash() {
  revalidate();
  revalidatePath("/reminders", "layout");
}

function optional(formData: FormData, name: string, max: number): string | null {
  return String(formData.get(name) ?? "").trim().slice(0, max) || null;
}

/** Drops a photo nothing points at any more (replaced, removed or its item deleted). */
async function dropOrphanPhoto(photoId: string | null) {
  if (photoId) await prisma.clothingPhoto.deleteMany({ where: { id: photoId, items: { none: {} } } });
}

type ItemFields = { name: string; categoryId: string | null; washGroup: WashGroup; price: number | null };

async function readItem(formData: FormData): Promise<ItemFields | string> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) return "Give it a name.";
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  if (categoryId && !(await prisma.clothingCategory.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    return "That category no longer exists. Pick another one.";
  }
  const rawPrice = String(formData.get("price") ?? "").trim();
  const price = rawPrice ? parseAmount(rawPrice) : null;
  if (rawPrice && price === null) return "That price isn't valid.";
  const rawGroup = formData.get("washGroup");
  return { name, categoryId, washGroup: isWashGroup(rawGroup) ? rawGroup : "coloured", price };
}

export async function createItem(_prev: WardrobeFormState, formData: FormData): Promise<WardrobeFormState> {
  await requireAuth();
  const fields = await readItem(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const photo = await readPhoto(formData);
  if (typeof photo === "string") return { ok: false, error: photo };
  const { categoryId, ...rest } = fields;
  const item = await prisma.clothingItem.create({
    data: {
      ...rest,
      statusSince: utc(await getTodayKey()),
      category: categoryId ? { connect: { id: categoryId } } : undefined,
      photo: photo ? { create: photo } : undefined,
    },
    select: { id: true },
  });
  revalidate();
  // "Save & add another" goes back to a fresh form that names what was just added.
  redirect(formData.get("next") === "another" ? `/wardrobe/items/add?added=${item.id}` : `/wardrobe/items/${item.id}`);
}

export async function updateItem(_prev: WardrobeFormState, formData: FormData): Promise<WardrobeFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const fields = await readItem(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const photo = await readPhoto(formData);
  if (typeof photo === "string") return { ok: false, error: photo };
  const removePhoto = formData.get("removePhoto") === "on";
  const old = await prisma.clothingItem.findUnique({ where: { id }, select: { photoId: true } });
  if (!old) return { ok: false, error: "That item no longer exists." };
  try {
    const { categoryId, ...rest } = fields;
    await prisma.clothingItem.update({
      where: { id },
      data: {
        ...rest,
        category: categoryId ? { connect: { id: categoryId } } : { disconnect: true },
        ...(photo ? { photo: { create: photo } } : removePhoto ? { photo: { disconnect: true } } : {}),
      },
    });
  } catch (e) {
    return knownError(e, { P2025: "That item no longer exists." });
  }
  if (photo || removePhoto) await dropOrphanPhoto(old.photoId);
  revalidate();
  redirect(`/wardrobe/items/${id}`);
}

/** Hides an item (it stays in its outfits); `archive=false` brings it back. */
export async function archiveItem(formData: FormData): Promise<void> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  await prisma.clothingItem.updateMany({ where: { id }, data: { isArchived: formData.get("archive") !== "false" } });
  revalidate();
  // "Bring back" on Settings stays there; the item page shows the new state.
  if (formData.get("back") !== "settings") redirect(`/wardrobe/items/${id}`);
}

/** Also leaves its outfits (onDelete: Cascade) and drops its photo. */
export async function deleteItem(formData: FormData): Promise<void> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const item = await prisma.clothingItem.findUnique({ where: { id }, select: { photoId: true } });
  await prisma.clothingItem.deleteMany({ where: { id } });
  await dropOrphanPhoto(item?.photoId ?? null);
  revalidate();
  redirect("/wardrobe/items");
}

/** Pieces a move actually moved, with the day their old status began, so Undo can restore both. */
export type MovedItem = { id: string; since: string };

/** Valid moved pieces sent back by the client (an Undo). */
function readMoved(moved: unknown, max = 1000): MovedItem[] {
  if (!Array.isArray(moved) || moved.length > max) return [];
  return moved.flatMap((m) => {
    const id = typeof m?.id === "string" ? m.id : null;
    const since = parseDateKey(m?.since);
    return id && since ? [{ id, since }] : [];
  });
}

/** Moves `moved` from `from` back to `to`, each with its own earlier `statusSince`. */
async function moveBack(tx: Prisma.TransactionClient, moved: MovedItem[], from: ClothingStatus, to: ClothingStatus) {
  const bySince = new Map<string, string[]>();
  for (const m of moved) bySince.set(m.since, [...(bySince.get(m.since) ?? []), m.id]);
  for (const [since, ids] of bySince) {
    await tx.clothingItem.updateMany({ where: { id: { in: ids }, status: from }, data: { status: to, statusSince: utc(since) } });
  }
}

/**
 * Moves items one step (a tick on the wash screen, "All washed", the item page's switch).
 * Guarded on `from`, the status the screen showed, so a double tap or another device is a
 * no-op. Returns what it moved, for `undoMove`.
 */
export async function moveItems(ids: string[], from: ClothingStatus, to: ClothingStatus): Promise<MovedItem[]> {
  await requireAuth();
  if (!isStatus(from) || !isStatus(to)) throw new Error("Unknown status.");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000) return [];
  const today = utc(await getTodayKey());
  const moved = await prisma.$transaction(async (tx) => {
    const rows = await tx.clothingItem.findMany({
      where: { id: { in: ids.map(String) }, status: from },
      select: { id: true, statusSince: true },
    });
    if (rows.length === 0) return [];
    await tx.clothingItem.updateMany({
      where: { id: { in: rows.map((r) => r.id) }, status: from },
      data: { status: to, statusSince: today },
    });
    return rows.map((r) => ({ id: r.id, since: dayKey(r.statusSince) }));
  });
  revalidate();
  return moved;
}

/** Undo of `moveItems(…, from, to)`: the pieces it moved go back to `from`, with their old dates. */
export async function undoMove(moved: MovedItem[], from: ClothingStatus, to: ClothingStatus): Promise<void> {
  await requireAuth();
  if (!isStatus(from) || !isStatus(to)) throw new Error("Unknown status.");
  const valid = readMoved(moved);
  if (valid.length === 0) return;
  await prisma.$transaction((tx) => moveBack(tx, valid, to, from));
  revalidate();
}

/**
 * Names an existing Last done item for a load may have ("Wash (coloured)"); the first wash
 * of that load adopts it, keeping its history. Compared lower-case, without punctuation.
 */
const WASH_NAMES: Record<WashGroup, string[]> = {
  coloured: ["wash coloured", "wash colored", "wash colour", "wash color", "coloured wash", "colored wash", "wash colours"],
  white: ["wash white", "wash whites", "white wash", "whites"],
};
const plainName = (name: string) => name.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * A load's Last done item: the linked one; else the single "wardrobe-wash" item of the first
 * washing version (it becomes the coloured load's, keeping its history); else an existing one
 * by name, adopted; else a new one. Inserts skip duplicates, so two first washes at once
 * (two phones) end up on the same item instead of failing.
 */
async function ensureWashRoutine(tx: Prisma.TransactionClient, group: WashGroup): Promise<string> {
  const source = WASH_ROUTINE_SOURCE[group];
  const find = () => tx.routine.findUnique({ where: { source }, select: { id: true } });
  const linked = await find();
  if (linked) return linked.id;
  if (group === "coloured") {
    await tx.routine.updateMany({ where: { source: LEGACY_WASH_SOURCE }, data: { source } });
  }
  if (!(await find())) {
    const unlinked = await tx.routine.findMany({ where: { source: null }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
    const named = unlinked.find((r) => WASH_NAMES[group].includes(plainName(r.name)));
    if (named) {
      await tx.routine.updateMany({ where: { id: named.id, source: null }, data: { source } });
    } else {
      // An unrelated item could hold the exact name; then the new one gets a variant.
      const name = WASH_ROUTINE_NAME[group];
      for (const candidate of [name, `${name} · Wardrobe`, `${name} · Wardrobe 2`, `${name} · Wardrobe 3`]) {
        await tx.routine.createMany({ data: [{ name: candidate, source }], skipDuplicates: true });
        if (await find()) break;
      }
    }
  }
  const row = await find();
  if (!row) throw new Error("Couldn't make the Last done item for the wash.");
  return row.id;
}

/**
 * A wash: the basket's pieces move to drying and each load washed (coloured / white) gets
 * today on its Last done item. `logged` = the loads whose log this call added and `moved` =
 * the pieces it moved, so Undo (`unwashItems`) takes back exactly those.
 */
export async function washItems(ids: string[]): Promise<{ logged: WashGroup[]; moved: MovedItem[] }> {
  await requireAuth();
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000) return { logged: [], moved: [] };
  const today = utc(await getTodayKey());
  const result = await prisma.$transaction(async (tx) => {
    const inBasket = await tx.clothingItem.findMany({
      where: { id: { in: ids.map(String) }, status: "wash" },
      select: { id: true, washGroup: true, statusSince: true },
    });
    // A double tap / another device moved nothing: no wash to log.
    if (inBasket.length === 0) return { logged: [], moved: [] };
    await tx.clothingItem.updateMany({
      where: { id: { in: inBasket.map((i) => i.id) }, status: "wash" },
      data: { status: "drying", statusSince: today },
    });
    const groups = new Set(inBasket.map((i) => (isWashGroup(i.washGroup) ? i.washGroup : "coloured")));
    const logged: WashGroup[] = [];
    for (const group of groups) {
      const routineId = await ensureWashRoutine(tx, group);
      // skipDuplicates: a log already there (an earlier wash today, another phone) isn't this wash's.
      const { count } = await tx.routineLog.createMany({ data: [{ routineId, doneOn: today }], skipDuplicates: true });
      if (count > 0) logged.push(group);
    }
    return { logged, moved: inBasket.map((i) => ({ id: i.id, since: dayKey(i.statusSince) })) };
  });
  revalidateWash();
  return result;
}

/**
 * Undo of a wash: the pieces it moved go back in the basket (with their old dates), and
 * today's log comes off the loads that wash added it to, unless another piece of that load
 * is still washed today (a second wash, another phone).
 */
export async function unwashItems(moved: MovedItem[], logged: WashGroup[]): Promise<void> {
  await requireAuth();
  const valid = readMoved(moved);
  if (valid.length === 0) return;
  const today = utc(await getTodayKey());
  const groups = (Array.isArray(logged) ? logged : []).filter(isWashGroup);
  await prisma.$transaction(async (tx) => {
    await moveBack(tx, valid, "drying", "wash");
    for (const group of groups) {
      const stillWashed = await tx.clothingItem.count({
        where: {
          status: "drying",
          statusSince: today,
          ...(group === "white" ? { washGroup: "white" } : { NOT: { washGroup: "white" } }),
        },
      });
      if (stillWashed > 0) continue;
      await tx.routineLog.deleteMany({ where: { doneOn: today, routine: { source: WASH_ROUTINE_SOURCE[group] } } });
    }
  });
  revalidateWash();
}

type OutfitFields = { name: string; notes: string | null; itemIds: string[] };

function readOutfit(formData: FormData): OutfitFields | string {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) return "Give the outfit a name.";
  const itemIds = [...new Set(formData.getAll("itemId").map(String).filter(Boolean))];
  if (itemIds.length === 0) return "Pick at least one item.";
  return { name, notes: optional(formData, "notes", 500), itemIds };
}

export async function createOutfit(_prev: WardrobeFormState, formData: FormData): Promise<WardrobeFormState> {
  await requireAuth();
  const fields = readOutfit(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  let id: string;
  try {
    const outfit = await prisma.outfit.create({
      data: { name: fields.name, notes: fields.notes, items: { create: fields.itemIds.map((itemId) => ({ itemId })) } },
      select: { id: true },
    });
    id = outfit.id;
  } catch (e) {
    return knownError(e, { P2003: "One of those items no longer exists." });
  }
  revalidate();
  redirect(`/wardrobe/outfits/${id}`);
}

export async function updateOutfit(_prev: WardrobeFormState, formData: FormData): Promise<WardrobeFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const fields = readOutfit(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  try {
    await prisma.$transaction([
      prisma.outfitItem.deleteMany({ where: { outfitId: id } }),
      prisma.outfit.update({
        where: { id },
        data: { name: fields.name, notes: fields.notes, items: { create: fields.itemIds.map((itemId) => ({ itemId })) } },
      }),
    ]);
  } catch (e) {
    return knownError(e, { P2025: "That outfit no longer exists.", P2003: "One of those items no longer exists." });
  }
  revalidate();
  redirect(`/wardrobe/outfits/${id}`);
}

export async function deleteOutfit(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.outfit.deleteMany({ where: { id: String(formData.get("id") ?? "") } });
  revalidate();
  redirect("/wardrobe/outfits");
}

/** Logs today; which pieces go in the basket is picked afterwards (`setWornInWash`). A second tap the same day changes nothing. */
export async function wearOutfit(outfitId: string): Promise<void> {
  await requireAuth();
  const today = utc(await getTodayKey());
  try {
    await prisma.outfitWear.create({ data: { outfitId: String(outfitId), wornOn: today } });
  } catch (e) {
    // Already logged today (double tap, another device), or the outfit is gone: nothing to do.
    knownError(e, { P2002: "Already worn today.", P2003: "That outfit no longer exists." });
  }
  revalidate();
}

/**
 * "Into the wash?" after wearing an outfit today: `inWash` puts clean pieces in the basket
 * and remembers them on today's wear (so Undo of the wear puts them back); false takes back
 * ones this list put in today.
 */
export async function setWornInWash(outfitId: string, itemIds: string[], inWash: boolean): Promise<void> {
  await requireAuth();
  if (!Array.isArray(itemIds) || itemIds.length === 0 || itemIds.length > 200) return;
  const today = utc(await getTodayKey());
  await prisma.$transaction(async (tx) => {
    const wear = await tx.outfitWear.findUnique({
      where: { outfitId_wornOn: { outfitId: String(outfitId), wornOn: today } },
      select: { id: true, movedItemIds: true, outfit: { select: { items: { select: { itemId: true } } } } },
    });
    if (!wear) return;
    const inOutfit = new Set(wear.outfit.items.map((i) => i.itemId));
    const ids = itemIds.map(String).filter((id) => inOutfit.has(id));
    const moved = new Set(wear.movedItemIds);
    if (inWash) {
      const clean = await tx.clothingItem.findMany({ where: { id: { in: ids }, status: "clean" }, select: { id: true } });
      const now = clean.map((i) => i.id);
      if (now.length === 0) return;
      await tx.clothingItem.updateMany({ where: { id: { in: now }, status: "clean" }, data: { status: "wash", statusSince: today } });
      for (const id of now) moved.add(id);
    } else {
      const back = ids.filter((id) => moved.has(id));
      if (back.length === 0) return;
      // Only while still in the basket from today; ones you moved on yourself stay put.
      await tx.clothingItem.updateMany({
        where: { id: { in: back }, status: "wash", statusSince: today },
        data: { status: "clean" },
      });
      for (const id of back) moved.delete(id);
    }
    await tx.outfitWear.update({ where: { id: wear.id }, data: { movedItemIds: [...moved] } });
  });
  revalidate();
}

/**
 * Takes today off the history (a mis-tap) and puts back the pieces that tap sent to the
 * wash, if they're still there; ones you had already put in yourself stay in the basket.
 */
export async function unwearToday(outfitId: string): Promise<void> {
  await requireAuth();
  const today = utc(await getTodayKey());
  const wear = await prisma.outfitWear.findUnique({
    where: { outfitId_wornOn: { outfitId, wornOn: today } },
    select: { id: true, movedItemIds: true },
  });
  if (wear) {
    await prisma.$transaction([
      prisma.outfitWear.deleteMany({ where: { id: wear.id } }),
      prisma.clothingItem.updateMany({
        where: { id: { in: wear.movedItemIds }, status: "wash", statusSince: today },
        data: { status: "clean" },
      }),
    ]);
  }
  revalidate();
}

/** "Wore this today" for one piece: logs the day; "Into the wash" is a separate tick (`setWornItemInWash`). */
export async function wearItem(itemId: string): Promise<void> {
  await requireAuth();
  const today = utc(await getTodayKey());
  try {
    await prisma.itemWear.create({ data: { itemId: String(itemId), wornOn: today } });
  } catch (e) {
    // Already logged today (double tap, another device), or the item is gone: nothing to do.
    knownError(e, { P2002: "Already worn today.", P2003: "That item no longer exists." });
  }
  revalidate();
}

/** The "Into the wash" tick after wearing a piece on its own today; false takes back what that tick put in. */
export async function setWornItemInWash(itemId: string, inWash: boolean): Promise<void> {
  await requireAuth();
  const today = utc(await getTodayKey());
  const id = String(itemId);
  await prisma.$transaction(async (tx) => {
    const wear = await tx.itemWear.findUnique({
      where: { itemId_wornOn: { itemId: id, wornOn: today } },
      select: { id: true, movedToWash: true },
    });
    if (!wear || wear.movedToWash === inWash) return;
    const { count } = inWash
      ? await tx.clothingItem.updateMany({ where: { id, status: "clean" }, data: { status: "wash", statusSince: today } })
      : await tx.clothingItem.updateMany({ where: { id, status: "wash", statusSince: today }, data: { status: "clean" } });
    // Not clean any more / already moved on: leave it, the tick shows the real state.
    await tx.itemWear.update({ where: { id: wear.id }, data: { movedToWash: count > 0 ? inWash : false } });
  });
  revalidate();
}

/** Takes today off this piece's own wears and, if that tap sent it to the wash, puts it back. */
export async function unwearItemToday(itemId: string): Promise<void> {
  await requireAuth();
  const today = utc(await getTodayKey());
  const id = String(itemId);
  const wear = await prisma.itemWear.findUnique({
    where: { itemId_wornOn: { itemId: id, wornOn: today } },
    select: { id: true, movedToWash: true },
  });
  if (wear) {
    const drop = prisma.itemWear.deleteMany({ where: { id: wear.id } });
    if (wear.movedToWash) {
      // Only if it's still in the basket from today's tap; one you moved on yourself stays put.
      await prisma.$transaction([
        drop,
        prisma.clothingItem.updateMany({ where: { id, status: "wash", statusSince: today }, data: { status: "clean" } }),
      ]);
    } else {
      await drop;
    }
  }
  revalidate();
}

export type CategoryResult = { ok: true } | { ok: false; error: string };

function readCategoryName(raw: unknown): string | null {
  const name = String(raw ?? "").trim().slice(0, 40);
  return name || null;
}

export async function createCategory(rawName: string): Promise<CategoryResult> {
  await requireAuth();
  const name = readCategoryName(rawName);
  if (!name) return { ok: false, error: "Give the category a name." };
  const last = await prisma.clothingCategory.aggregate({ _max: { sortOrder: true } });
  try {
    await prisma.clothingCategory.create({ data: { name, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  } catch (e) {
    return knownError(e, { P2002: `There's already a category called "${name}".` });
  }
  revalidate();
  return { ok: true };
}

export async function renameCategory(id: string, rawName: string): Promise<CategoryResult> {
  await requireAuth();
  const name = readCategoryName(rawName);
  if (!name) return { ok: false, error: "Give the category a name." };
  try {
    await prisma.clothingCategory.update({ where: { id: String(id) }, data: { name } });
  } catch (e) {
    return knownError(e, {
      P2002: `There's already a category called "${name}".`,
      P2025: "That category no longer exists.",
    });
  }
  revalidate();
  return { ok: true };
}

/** Saves the order shown on Settings (every category's id, top first). */
export async function reorderCategories(orderedIds: string[]): Promise<CategoryResult> {
  await requireAuth();
  if (!Array.isArray(orderedIds) || orderedIds.length > 200) return { ok: false, error: "That order isn't valid." };
  await prisma.$transaction(
    orderedIds.map((id, sortOrder) => prisma.clothingCategory.updateMany({ where: { id: String(id) }, data: { sortOrder } })),
  );
  revalidate();
  return { ok: true };
}

/** Its items stay, without a category (onDelete: SetNull). */
export async function deleteCategory(id: string): Promise<CategoryResult> {
  await requireAuth();
  await prisma.clothingCategory.deleteMany({ where: { id: String(id) } });
  revalidate();
  return { ok: true };
}
