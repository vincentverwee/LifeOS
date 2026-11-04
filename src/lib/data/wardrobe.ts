import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { wearDays } from "@/lib/wardrobe/logic";
import { DEFAULT_CATEGORIES, NO_CATEGORY, isCutout, isStatus, isWashGroup, WASH_ROUTINE_SOURCE, type Category, type ClothingStatus, type WashGroup } from "@/lib/wardrobe/types";

export type Item = {
  id: string;
  name: string;
  categoryId: string | null;
  /** The category's name, or NO_CATEGORY. */
  categoryName: string;
  washGroup: WashGroup;
  status: ClothingStatus;
  /** Day the status last changed ("YYYY-MM-DD"). */
  statusSince: string;
  isArchived: boolean;
  photoId: string | null;
  /** The photo has its background removed: shown whole, on the app's colour. */
  photoCutout: boolean;
  /** What it cost (euros); null = no price, so no cost per wear. */
  price: number | null;
};

const ITEM_SELECT = {
  id: true,
  name: true,
  categoryId: true,
  category: { select: { name: true } },
  washGroup: true,
  status: true,
  statusSince: true,
  isArchived: true,
  photoId: true,
  photo: { select: { mime: true } },
  price: true,
} as const;

type ItemRow = {
  id: string;
  name: string;
  categoryId: string | null;
  category: { name: string } | null;
  washGroup: string;
  status: string;
  statusSince: Date;
  isArchived: boolean;
  photoId: string | null;
  photo: { mime: string } | null;
  price: { toNumber(): number } | null;
};

function toItem({ category, photo, price, ...row }: ItemRow): Item {
  return {
    ...row,
    price: price === null ? null : price.toNumber(),
    photoCutout: isCutout(photo?.mime),
    categoryName: category?.name ?? NO_CATEGORY,
    washGroup: isWashGroup(row.washGroup) ? row.washGroup : "coloured",
    status: isStatus(row.status) ? row.status : "clean",
    statusSince: dayKey(row.statusSince),
  };
}

/**
 * The categories in their order. The very first time (no categories and no clothes yet)
 * it creates the defaults, so a fresh wardrobe isn't empty; after that it never does.
 */
export async function getCategories(): Promise<(Category & { itemCount: number })[]> {
  const load = () =>
    prisma.clothingCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, _count: { select: { items: true } } },
    });
  let rows = await load();
  if (rows.length === 0 && (await prisma.clothingItem.count()) === 0) {
    await prisma.clothingCategory.createMany({
      data: DEFAULT_CATEGORIES.map((name, sortOrder) => ({ name, sortOrder })),
      skipDuplicates: true,
    });
    rows = await load();
  }
  return rows.map((r) => ({ id: r.id, name: r.name, itemCount: r._count.items }));
}

/** Items without their photo bytes (those load through /api/wardrobe/photo/[id]). */
export async function getItems(opts: { archived?: boolean } = {}): Promise<Item[]> {
  const rows = await prisma.clothingItem.findMany({
    where: opts.archived ? undefined : { isArchived: false },
    orderBy: [{ name: "asc" }],
    select: ITEM_SELECT,
  });
  return rows.map(toItem);
}

export async function getItem(id: string): Promise<Item | null> {
  const row = await prisma.clothingItem.findUnique({ where: { id }, select: ITEM_SELECT });
  return row ? toItem(row) : null;
}

export type ItemWears = {
  /** Distinct days worn (in an outfit or on its own) since it was added. */
  count: number;
  lastWornOn: string | null;
  /** Worn today with the item's own button (Undo-able here). */
  wornTodayDirect: boolean;
  /** Worn today as part of an outfit (undone on the outfit's page). */
  wornTodayViaOutfit: boolean;
  /** Today's own wear put it in the basket ("Into the wash" ticked). */
  inWashFromToday: boolean;
};

export async function getItemWears(itemId: string, todayKey: string): Promise<ItemWears | null> {
  const [item, outfitWears, ownWears] = await Promise.all([
    prisma.clothingItem.findUnique({ where: { id: itemId }, select: { createdAt: true } }),
    prisma.outfitWear.findMany({ where: { outfit: { items: { some: { itemId } } } }, select: { wornOn: true } }),
    prisma.itemWear.findMany({ where: { itemId }, select: { wornOn: true, movedToWash: true } }),
  ]);
  if (!item) return null;
  const outfitDays = outfitWears.map((w) => dayKey(w.wornOn));
  const ownDays = ownWears.map((w) => dayKey(w.wornOn));
  const days = wearDays(outfitDays, ownDays, dayKey(item.createdAt));
  return {
    count: days.length,
    lastWornOn: days.at(-1) ?? null,
    wornTodayDirect: ownDays.includes(todayKey),
    wornTodayViaOutfit: outfitDays.includes(todayKey),
    inWashFromToday: ownWears.some((w) => w.movedToWash && dayKey(w.wornOn) === todayKey),
  };
}

export type OutfitSummary = {
  id: string;
  name: string;
  notes: string | null;
  items: Item[];
  lastWornOn: string | null;
  wearCount: number;
  wornToday: boolean;
};

const OUTFIT_SELECT = {
  id: true,
  name: true,
  notes: true,
  items: { select: { item: { select: ITEM_SELECT } } },
  wears: { select: { wornOn: true, movedItemIds: true }, orderBy: { wornOn: "desc" as const } },
} as const;

type OutfitRow = {
  id: string;
  name: string;
  notes: string | null;
  items: { item: ItemRow }[];
  wears: { wornOn: Date; movedItemIds: string[] }[];
};

function toOutfit(row: OutfitRow, todayKey: string): OutfitSummary {
  const last = row.wears[0] ? dayKey(row.wears[0].wornOn) : null;
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    items: row.items.map((i) => toItem(i.item)).sort((a, b) => a.name.localeCompare(b.name)),
    lastWornOn: last,
    wearCount: row.wears.length,
    wornToday: last === todayKey,
  };
}

export async function getOutfits(todayKey: string): Promise<OutfitSummary[]> {
  const rows = await prisma.outfit.findMany({ orderBy: [{ createdAt: "desc" }], select: OUTFIT_SELECT });
  return rows.map((r) => toOutfit(r, todayKey));
}

export async function getOutfit(
  id: string,
  todayKey: string,
): Promise<(OutfitSummary & { wornDays: string[]; todayMovedIds: string[] }) | null> {
  const row = await prisma.outfit.findUnique({ where: { id }, select: OUTFIT_SELECT });
  if (!row) return null;
  const outfit = toOutfit(row, todayKey);
  return {
    ...outfit,
    wornDays: row.wears.map((w) => dayKey(w.wornOn)),
    // The pieces put in the basket from today's wear (the "Into the wash?" ticks).
    todayMovedIds: outfit.wornToday ? row.wears[0].movedItemIds : [],
  };
}

/** The day of the last wash of either load (the Last done items Wardrobe → Wash logs), or null. */
export async function getLastWashOn(): Promise<string | null> {
  const log = await prisma.routineLog.findFirst({
    where: { routine: { source: { in: Object.values(WASH_ROUTINE_SOURCE) } } },
    orderBy: { doneOn: "desc" },
    select: { doneOn: true },
  });
  return log ? dayKey(log.doneOn) : null;
}

export type WardrobeGlance = { wash: number; drying: number; items: number; outfits: number };

export async function getWardrobeGlance(): Promise<WardrobeGlance> {
  const [byStatus, outfits] = await Promise.all([
    prisma.clothingItem.groupBy({ by: ["status"], where: { isArchived: false }, _count: { _all: true } }),
    prisma.outfit.count(),
  ]);
  const count = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
  return {
    wash: count("wash"),
    drying: count("drying"),
    items: count("clean") + count("wash") + count("drying"),
    outfits,
  };
}
