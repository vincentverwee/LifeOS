"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readPhoto } from "@/lib/images/upload";
import { isUuid } from "@/lib/waypoint/uuid";

export type StickerResult = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/waypoint", "layout");
}

function text(formData: FormData, name: string, max: number): string | null {
  return String(formData.get(name) ?? "").trim().slice(0, max) || null;
}

/** The "Bought at" stop: none, or a stop of this very trip. */
async function readStop(formData: FormData, tripId: string): Promise<string | null | { error: string }> {
  const raw = String(formData.get("locationId") ?? "");
  if (!raw) return null;
  if (!isUuid(raw)) return { error: "That stop isn't valid." };
  const stop = await prisma.waypointLocation.findFirst({ where: { id: raw, tripId }, select: { id: true } });
  return stop ? stop.id : { error: "That stop isn't on this trip any more." };
}

/** Drops these sticker photos if nothing points at them any more (replaced, or sticker deleted). */
async function dropOrphanStickerPhotos(ids: string[]) {
  await prisma.stickerPhoto.deleteMany({ where: { id: { in: ids }, sticker: null } });
}

export async function createSticker(formData: FormData): Promise<StickerResult> {
  await requireAuth();
  const tripId = String(formData.get("tripId") ?? "");
  if (!isUuid(tripId) || !(await prisma.waypointTrip.findUnique({ where: { id: tripId }, select: { id: true } }))) {
    return { ok: false, error: "That trip no longer exists." };
  }
  const photo = await readPhoto(formData);
  if (typeof photo === "string") return { ok: false, error: photo };
  if (!photo) return { ok: false, error: "Add a photo of the sticker." };
  const stop = await readStop(formData, tripId);
  if (stop && typeof stop === "object") return { ok: false, error: stop.error };
  await prisma.waypointSticker.create({
    data: {
      trip: { connect: { id: tripId } },
      ...(stop ? { location: { connect: { id: stop } } } : {}),
      name: text(formData, "name", 80),
      note: text(formData, "note", 500),
      photo: { create: photo },
    },
  });
  revalidate();
  return { ok: true };
}

export async function updateSticker(formData: FormData): Promise<StickerResult> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const sticker = isUuid(id)
    ? await prisma.waypointSticker.findUnique({ where: { id }, select: { tripId: true, photoId: true } })
    : null;
  if (!sticker) return { ok: false, error: "That sticker no longer exists." };
  const photo = await readPhoto(formData);
  if (typeof photo === "string") return { ok: false, error: photo };
  const stop = await readStop(formData, sticker.tripId);
  if (stop && typeof stop === "object") return { ok: false, error: stop.error };
  await prisma.waypointSticker.update({
    where: { id },
    data: {
      location: stop ? { connect: { id: stop } } : { disconnect: true },
      name: text(formData, "name", 80),
      note: text(formData, "note", 500),
      // A new photo is a new row, so its URL can be cached forever; the old one goes.
      ...(photo ? { photo: { create: photo } } : {}),
    },
  });
  if (photo) await dropOrphanStickerPhotos([sticker.photoId]);
  revalidate();
  return { ok: true };
}

export async function deleteSticker(id: string): Promise<void> {
  await requireAuth();
  if (!isUuid(String(id))) return;
  const sticker = await prisma.waypointSticker.findUnique({ where: { id: String(id) }, select: { photoId: true } });
  if (!sticker) return;
  await prisma.waypointSticker.deleteMany({ where: { id: String(id) } });
  await dropOrphanStickerPhotos([sticker.photoId]);
  revalidate();
}
