import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { isKind, isStatus, type ClothingKind, type ClothingStatus } from "@/lib/wardrobe/types";

export type Item = {
  id: string;
  name: string;
  kind: ClothingKind;
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
  kind: true,
  color: true,
  status: true,
  statusSince: true,
  isArchived: true,
  photoId: true,
} as const;

type ItemRow = {
  id: string;
  name: string;
  kind: string;
  color: string | null;
  status: string;
  statusSince: Date;
  isArchived: boolean;
  photoId: string | null;
};

function toItem(row: ItemRow): Item {
  return {
    ...row,
    kind: isKind(row.kind) ? row.kind : "other",
    status: isStatus(row.status) ? row.status : "clean",
    statusSince: dayKey(row.statusSince),
  };
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
