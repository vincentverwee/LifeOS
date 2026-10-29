"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { knownError } from "@/lib/prismaErrors";
import { MAX_PUB_NAME } from "@/lib/beer/types";

export type BeerResult = { ok: true } | { ok: false; error: string };

function revalidateBeer() {
  revalidatePath("/beer", "layout");
  revalidatePath("/budget/add"); // the pub picker's list
  revalidatePath("/budget/expenses"); // pub names under beers
  revalidatePath("/"); // hub tile
}

export async function renamePub(id: string, name: string): Promise<BeerResult> {
  await requireAuth();
  const clean = String(name ?? "").trim().slice(0, MAX_PUB_NAME);
  if (!clean) return { ok: false, error: "Give the pub a name." };
  try {
    await prisma.pub.update({ where: { id }, data: { name: clean } });
  } catch (e) {
    return knownError(e, { P2025: "That pub no longer exists." });
  }
  revalidateBeer();
  return { ok: true };
}

/** Puts the pub on the map at a GPS fix, or takes it off (null). */
export async function setPubPosition(
  id: string,
  position: { latitude: number; longitude: number } | null
): Promise<BeerResult> {
  await requireAuth();
  let data: { latitude: number | null; longitude: number | null } = { latitude: null, longitude: null };
  if (position) {
    const latitude = Number(position.latitude);
    const longitude = Number(position.longitude);
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
      return { ok: false, error: "That location doesn't look right." };
    }
    data = { latitude, longitude };
  }
  try {
    await prisma.pub.update({ where: { id }, data });
  } catch (e) {
    return knownError(e, { P2025: "That pub no longer exists." });
  }
  revalidateBeer();
  return { ok: true };
}

/** Moves every beer of `fromId` to `intoId` and deletes `fromId` (for a pub you have twice). */
export async function mergePub(fromId: string, intoId: string): Promise<BeerResult> {
  await requireAuth();
  if (fromId === intoId) return { ok: false, error: "Pick another pub to merge into." };
  const [from, into] = await Promise.all([
    prisma.pub.findUnique({ where: { id: fromId }, select: { osmId: true, latitude: true, longitude: true } }),
    prisma.pub.findUnique({ where: { id: intoId }, select: { osmId: true, latitude: true } }),
  ]);
  if (!from || !into) return { ok: false, error: "That pub no longer exists." };
  await prisma.$transaction([
    prisma.expense.updateMany({ where: { pubId: fromId }, data: { pubId: intoId } }),
    prisma.pub.delete({ where: { id: fromId } }),
    // Keep what only the merged one knew: its OpenStreetMap id and position.
    prisma.pub.update({
      where: { id: intoId },
      data: {
        ...(into.osmId === null && from.osmId !== null && { osmId: from.osmId }),
        ...(into.latitude === null && from.latitude !== null && { latitude: from.latitude, longitude: from.longitude }),
      },
    }),
  ]);
  revalidateBeer();
  return { ok: true };
}

/** Deletes the pub; its beers stay (spend and pints) without a pub. */
export async function deletePub(id: string): Promise<BeerResult> {
  await requireAuth();
  const { count } = await prisma.pub.deleteMany({ where: { id } });
  if (count === 0) return { ok: false, error: "That pub no longer exists." };
  revalidateBeer();
  return { ok: true };
}
