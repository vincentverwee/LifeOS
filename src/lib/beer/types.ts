// Client-safe shapes shared by the pub picker, the offline outbox and the expense actions.

/** How a beer's pub was picked: one of yours, a nearby OpenStreetMap place, or a typed name. */
export type PubChoice =
  /** `place`: an OpenStreetMap spot found for one of yours that isn't on the map yet */
  | { kind: "known"; id: string; place?: { osmId: string; latitude: number; longitude: number } }
  | { kind: "osm"; osmId: string; name: string; latitude: number; longitude: number }
  /** latitude/longitude: the phone's position when it was typed, if there was one */
  | { kind: "typed"; name: string; latitude?: number; longitude?: number };

/** Your pubs as the picker needs them (loaded with the page, so it works offline). */
export type PubOption = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  osmId: string | null;
  /** latest counted price per pint, for the pints stepper's first guess */
  pricePerPint: number | null;
  /** "YYYY-MM-DD" of the latest visit */
  lastVisit: string | null;
};

export const MAX_PUB_NAME = 80;
export const MAX_PINTS = 50;

const OSM_ID = /^(node|way|relation)\/\d{1,15}$/;

function coordinate(value: unknown, limit: number): number | undefined {
  const n = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : undefined;
}

/** A PubChoice from untrusted input (form JSON, an old outbox entry), or null. */
export function parsePubChoice(value: unknown): PubChoice | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const name = typeof v.name === "string" ? v.name.trim().slice(0, MAX_PUB_NAME) : "";
  const latitude = coordinate(v.latitude, 90);
  const longitude = coordinate(v.longitude, 180);
  if (v.kind === "known" && typeof v.id === "string" && v.id.length <= 40) {
    const p = v.place as Record<string, unknown> | undefined;
    const placeLat = coordinate(p?.latitude, 90);
    const placeLng = coordinate(p?.longitude, 180);
    const place =
      p && typeof p.osmId === "string" && OSM_ID.test(p.osmId) && placeLat !== undefined && placeLng !== undefined
        ? { osmId: p.osmId, latitude: placeLat, longitude: placeLng }
        : undefined;
    return place ? { kind: "known", id: v.id, place } : { kind: "known", id: v.id };
  }
  if (v.kind === "osm" && typeof v.osmId === "string" && OSM_ID.test(v.osmId) && name && latitude !== undefined && longitude !== undefined) {
    return { kind: "osm", osmId: v.osmId, name, latitude, longitude };
  }
  if (v.kind === "typed" && name) {
    return latitude !== undefined && longitude !== undefined ? { kind: "typed", name, latitude, longitude } : { kind: "typed", name };
  }
  return null;
}

/** A pint count from untrusted input: a whole number 1–MAX_PINTS, else null. */
export function parsePints(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PINTS ? n : null;
}
