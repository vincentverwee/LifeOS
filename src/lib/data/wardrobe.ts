import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { DEFAULT_CATEGORIES, NO_CATEGORY, isStatus, type Category, type ClothingStatus } from "@/lib/wardrobe/types";

export type Item = {
  id: string;
  name: string;
  categoryId: string | null;
  /** The category's name, or NO_CATEGORY. */
  categoryName: string;
  color: string | null;
  status: ClothingStatus;
  /** Day the status last changed ("YYYY-MM-DD"). */
  statusSince: string;
  isArchived: boolean;
  photoId: string | null;
};

const ITEM_SELECT = {
  id: true,
  name: true,
  categoryId: true,
  category: { select: { name: true } },
  color: true,
  status: true,
  statusSince: true,
  isArchived: true,
  photoId: true,
} as const;

type ItemRow = {
  id: string;
  name: string;
  categoryId: string | null;
  category: { name: string } | null;
  color: string | null;
  status: string;
  statusSince: Date;
  isArchived: boolean;
  photoId: string | null;
};

function toItem({ category, ...row }: ItemRow): Item {
  return {
    ...row,
    categoryName: category?.name ?? NO_CATEGORY,
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
  wears: { select: { wornOn: true }, orderBy: { wornOn: "desc" as const } },
} as const;

type OutfitRow = {
  id: string;
  name: string;
  notes: string | null;
  items: { item: ItemRow }[];
  wears: { wornOn: Date }[];
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
): Promise<(OutfitSummary & { wornDays: string[] }) | null> {
  const row = await prisma.outfit.findUnique({ where: { id }, select: OUTFIT_SELECT });
  return row ? { ...toOutfit(row, todayKey), wornDays: row.wears.map((w) => dayKey(w.wornOn)) } : null;
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
