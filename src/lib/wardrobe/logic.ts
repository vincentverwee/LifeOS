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
