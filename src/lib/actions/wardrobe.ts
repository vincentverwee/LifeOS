"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTodayKey } from "@/lib/today";
import { knownError } from "@/lib/prismaErrors";
import { isStatus, MAX_PHOTO_BYTES, PHOTO_MIME, type ClothingStatus } from "@/lib/wardrobe/types";

export type WardrobeFormState = { ok: true } | { ok: false; error: string } | null;

const utc = (key: string) => new Date(`${key}T00:00:00Z`);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/wardrobe", "layout");
}

function optional(formData: FormData, name: string, max: number): string | null {
  return String(formData.get(name) ?? "").trim().slice(0, max) || null;
}

/** The uploaded photo (already shrunk by the browser); null when none was picked, a string on error. */
async function readPhoto(formData: FormData): Promise<{ data: Uint8Array<ArrayBuffer>; mime: string } | null | string> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.type !== PHOTO_MIME) return "That photo isn't a JPEG.";
  if (file.size > MAX_PHOTO_BYTES) return "That photo is too big.";
  return { data: new Uint8Array(await file.arrayBuffer()), mime: PHOTO_MIME };
}

/** Drops a photo nothing points at any more (replaced, removed or its item deleted). */
async function dropOrphanPhoto(photoId: string | null) {
  if (photoId) await prisma.clothingPhoto.deleteMany({ where: { id: photoId, items: { none: {} } } });
}

type ItemFields = { name: string; categoryId: string | null; color: string | null };

async function readItem(formData: FormData): Promise<ItemFields | string> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) return "Give it a name.";
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  if (categoryId && !(await prisma.clothingCategory.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    return "That category no longer exists. Pick another one.";
  }
  return { name, categoryId, color: optional(formData, "color", 40) };
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

/**
 * Moves items one step (a tick on the wash screen, "All washed", an undo). Guarded on
 * `from`, the status the screen showed, so a double tap or another device is a no-op.
 */
export async function moveItems(ids: string[], from: ClothingStatus, to: ClothingStatus): Promise<void> {
  await requireAuth();
  if (!isStatus(from) || !isStatus(to)) throw new Error("Unknown status.");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000) return;
  await prisma.clothingItem.updateMany({
    where: { id: { in: ids.map(String) }, status: from },
    data: { status: to, statusSince: utc(await getTodayKey()) },
  });
  revalidate();
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

/** Logs today and sends the outfit's clean pieces to the wash. A second tap the same day changes nothing. */
export async function wearOutfit(outfitId: string): Promise<void> {
  await requireAuth();
  const today = utc(await getTodayKey());
  const outfit = await prisma.outfit.findUnique({
    where: { id: outfitId },
    select: { items: { select: { itemId: true, item: { select: { status: true } } } } },
  });
  if (!outfit) return;
  const moved = outfit.items.filter((i) => i.item.status === "clean").map((i) => i.itemId);
  try {
    await prisma.$transaction([
      prisma.outfitWear.create({ data: { outfitId, wornOn: today, movedItemIds: moved } }),
      prisma.clothingItem.updateMany({
        where: { id: { in: moved }, status: "clean" },
        data: { status: "wash", statusSince: today },
      }),
    ]);
  } catch (e) {
    // Already logged today (double tap, another device): nothing to do.
    knownError(e, { P2002: "Already worn today." });
  }
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
