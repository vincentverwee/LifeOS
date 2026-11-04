// Waypoint stickers: the shapes the pages use, and the wall's grouping (pure).

export type Sticker = {
  id: string;
  name: string | null;
  note: string | null;
  /** The stop it was bought at, if any. */
  locationId: string | null;
  photoId: string;
  /** Background removed: shown whole on the app's colour. */
  cutout: boolean;
};

export type WallSticker = Sticker & {
  tripId: string;
  tripTitle: string;
  /** "YYYY-MM-DD" or null. */
  tripStart: string | null;
  withVan: boolean;
  stopName: string | null;
};

export const stickerSrc = (photoId: string) => `/api/waypoint/sticker/${photoId}`;

/** The wall by year of the trip's start, newest year first, undated trips last (`year` null). */
export function groupStickersByYear<T extends { tripStart: string | null }>(
  stickers: T[],
): { year: number | null; stickers: T[] }[] {
  const byYear = new Map<number | null, T[]>();
  for (const s of stickers) {
    const year = s.tripStart ? Number(s.tripStart.slice(0, 4)) : null;
    byYear.set(year, [...(byYear.get(year) ?? []), s]);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([year, list]) => ({ year, stickers: list }));
}
