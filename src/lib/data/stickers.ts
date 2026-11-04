import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import { isCutout } from "@/lib/images/types";
import { isUuid } from "@/lib/waypoint/uuid";
import type { Sticker, WallSticker } from "@/lib/waypoint/stickers";

const STICKER_SELECT = {
  id: true,
  name: true,
  note: true,
  locationId: true,
  photoId: true,
  photo: { select: { mime: true } },
} as const;

type StickerRow = {
  id: string;
  name: string | null;
  note: string | null;
  locationId: string | null;
  photoId: string;
  photo: { mime: string };
};

const toSticker = ({ photo, ...row }: StickerRow): Sticker => ({ ...row, cutout: isCutout(photo.mime) });

/** One trip's stickers, oldest first (no photo bytes; those load via /api/waypoint/sticker/[id]). */
export async function getTripStickers(tripId: string): Promise<Sticker[]> {
  if (!isUuid(tripId)) return [];
  const rows = await prisma.waypointSticker.findMany({
    where: { tripId },
    orderBy: { createdAt: "asc" },
    select: STICKER_SELECT,
  });
  return rows.map(toSticker);
}

/** Every sticker for the wall, with its trip and stop. */
export async function getAllStickers(): Promise<WallSticker[]> {
  const rows = await prisma.waypointSticker.findMany({
    orderBy: [{ trip: { startDate: { sort: "desc", nulls: "last" } } }, { createdAt: "asc" }],
    select: {
      ...STICKER_SELECT,
      trip: { select: { id: true, title: true, startDate: true, withVan: true } },
      location: { select: { name: true, city: true } },
    },
  });
  return rows.map(({ trip, location, ...row }) => ({
    ...toSticker(row),
    tripId: trip.id,
    tripTitle: trip.title,
    tripStart: trip.startDate ? dayKey(trip.startDate) : null,
    withVan: trip.withVan,
    stopName: location ? (location.city ?? location.name) : null,
  }));
}

/** Each trip's first sticker, shown instead of the pin on its trip card. */
export async function getFirstStickerByTrip(): Promise<Record<string, { photoId: string; cutout: boolean }>> {
  const rows = await prisma.waypointSticker.findMany({
    orderBy: { createdAt: "asc" },
    select: { tripId: true, photoId: true, photo: { select: { mime: true } } },
  });
  const first: Record<string, { photoId: string; cutout: boolean }> = {};
  for (const r of rows) first[r.tripId] ??= { photoId: r.photoId, cutout: isCutout(r.photo.mime) };
  return first;
}

export async function countStickers(): Promise<number> {
  return prisma.waypointSticker.count();
}
