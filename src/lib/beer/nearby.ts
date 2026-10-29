// Places to drink near a point (pubs and bars first, also restaurants, cafés and hotels:
// see venues.ts), from OpenStreetMap's Overpass API. Called from the
// browser on the Nearby tap (the public servers are meant for human-operated tools,
// not server traffic), first the main server, then a mirror, within NEARBY_TIMEOUT_MS
// overall. Any failure is just "no suggestions": the name can always be typed.

import { greatCircleKm } from "@/lib/waypoint/routing/lines";
import { NEARBY_TAGS, venueLabel, venueRank, venueType } from "@/lib/beer/venues";

export type NearbyPlace = {
  osmId: string;
  name: string;
  /** "Pub", "Restaurant", … */
  kind: string;
  latitude: number;
  longitude: number;
  distance: number;
};

const SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
export const NEARBY_TIMEOUT_MS = 4000;
/** How far around the phone to look, in metres. */
export const NEARBY_RADIUS_M = 150;
const FIRST_TRY_MS = 2500;
/** Asked of Overpass (restaurants can crowd a city centre), and shown after sorting. */
const MAX_PLACES = 40;
const SHOWN_PLACES = 12;

/** Metres between two points (Waypoint's great-circle formula). */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return greatCircleKm({ latitude: lat1, longitude: lng1 }, { latitude: lat2, longitude: lng2 }) * 1000;
}

export function nearbyQuery(latitude: number, longitude: number, radius = NEARBY_RADIUS_M): string {
  const around = `(around:${radius},${latitude},${longitude})`;
  const parts = Object.entries(NEARBY_TAGS).map(([key, values]) => `nwr["${key}"~"${values}"]${around};`);
  return `[out:json][timeout:5];(${parts.join("")});out center ${MAX_PLACES};`;
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Named places from an Overpass reply: pubs and bars first, then nearest. Ways and areas use their centre. */
export function parseNearby(json: unknown, latitude: number, longitude: number): NearbyPlace[] {
  const elements = (json as { elements?: OverpassElement[] })?.elements ?? [];
  const places: NearbyPlace[] = [];
  for (const el of elements) {
    const name = el.tags?.name?.trim();
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!name || lat === undefined || lon === undefined) continue;
    places.push({
      osmId: `${el.type}/${el.id}`,
      name: name.slice(0, 80),
      kind: venueType(el.tags ?? {}),
      latitude: lat,
      longitude: lon,
      distance: Math.round(distanceM(latitude, longitude, lat, lon)),
    });
  }
  return places
    .sort((a, b) => venueRank(a.kind) - venueRank(b.kind) || a.distance - b.distance)
    .slice(0, SHOWN_PLACES)
    .map((p) => ({ ...p, kind: venueLabel(p.kind) }));
}

/** Nearby pubs and bars, or [] when every server failed or took too long. */
export async function findNearby(latitude: number, longitude: number): Promise<NearbyPlace[]> {
  const deadline = Date.now() + NEARBY_TIMEOUT_MS;
  const body = new URLSearchParams({ data: nearbyQuery(latitude, longitude) });
  for (const [i, server] of SERVERS.entries()) {
    const left = deadline - Date.now();
    if (left <= 200) break;
    try {
      // The main server gets part of the time, so a hanging one still leaves room for the mirror.
      const wait = i < SERVERS.length - 1 ? Math.min(left, FIRST_TRY_MS) : left;
      const res = await fetch(server, { method: "POST", body, signal: AbortSignal.timeout(wait) });
      if (res.ok) return parseNearby(await res.json(), latitude, longitude);
    } catch {
      // busy or too slow: try the next server
    }
  }
  return [];
}
