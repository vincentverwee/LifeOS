import type { ClothingStatus } from "./types";

export type OutfitPiece = { id: string; name: string; status: ClothingStatus; isArchived: boolean };

/** An outfit is ready when every piece is clean; archived pieces are ignored. */
export function outfitReadiness(pieces: OutfitPiece[]): { ready: boolean; unavailable: OutfitPiece[] } {
  const unavailable = pieces.filter((p) => !p.isArchived && p.status !== "clean");
  return { ready: unavailable.length === 0, unavailable };
}

/** "In the wash" / "Drying" / both counts, for the badge on an outfit. */
export function describeUnavailable(unavailable: OutfitPiece[]): string {
  const wash = unavailable.filter((p) => p.status === "wash").length;
  const drying = unavailable.filter((p) => p.status === "drying").length;
  const parts: string[] = [];
  if (wash) parts.push(`${wash} in the wash`);
  if (drying) parts.push(`${drying} drying`);
  return parts.join(", ");
}

/** Days from `from` to `to`, both "YYYY-MM-DD". */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function describeWorn(lastWornOn: string | null, todayKey: string): string {
  if (!lastWornOn) return "Never worn";
  const days = daysBetween(lastWornOn, todayKey);
  if (days <= 0) return "Worn today";
  if (days === 1) return "Worn yesterday";
  return `Worn ${days} days ago`;
}

export type CategoryGroup<T> = { id: string | null; name: string; items: T[] };

/**
 * Items grouped by category in the categories' order, "No category" last; empty groups
 * are left out. Items keep their incoming order inside a group.
 */
export function groupByCategory<T extends { categoryId: string | null }>(
  items: T[],
  categories: { id: string; name: string }[],
  noCategory = "No category",
): CategoryGroup<T>[] {
  const groups: CategoryGroup<T>[] = categories.map((c) => ({ id: c.id, name: c.name, items: [] }));
  const byId = new Map(groups.map((g) => [g.id, g]));
  const loose: CategoryGroup<T> = { id: null, name: noCategory, items: [] };
  for (const item of items) (byId.get(item.categoryId ?? "") ?? loose).items.push(item);
  return [...groups, loose].filter((g) => g.items.length > 0);
}

/**
 * The distinct days a piece was worn, oldest first: days its outfits were worn plus days
 * it was worn on its own, from `sinceKey` (the day it was added, so a new piece put in an
 * old outfit doesn't inherit that outfit's history). All "YYYY-MM-DD".
 */
export function wearDays(outfitDays: string[], itemDays: string[], sinceKey: string): string[] {
  return [...new Set([...outfitDays, ...itemDays])].filter((d) => d >= sinceKey).sort();
}

/** What each wear cost so far; null without a price or before the first wear. */
export function costPerWear(price: number | null, wears: number): number | null {
  if (price === null || wears <= 0) return null;
  return price / wears;
}
