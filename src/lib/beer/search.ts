// Pubs by name from Nominatim (/api/beer/search). Client-safe: the picker calls searchPubs,
// the route uses parsePubSearch.

import { distanceM } from "@/lib/beer/nearby";

export type FoundPub = {
  osmId: string;
  name: string;
  /** town and country, to tell same-named places apart */
  place: string;
  latitude: number;
  longitude: number;
  /** metres from the spot the search leaned toward, if any */
  distance: number | null;
};

/** Half the side of the box the search leans toward, in degrees (~50 km). */
export const PUB_SEARCH_VIEWBOX_DEG = 0.5;
const KINDS = new Set(["pub", "bar", "biergarten", "nightclub"]);
const MAX_RESULTS = 6;

type NominatimRow = {
  osm_type?: string;
  osm_id?: number;
  class?: string;
  type?: string;
  name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string>;
};

/** Only pubs, bars, beer gardens and clubs; nearest first when there's a spot to lean toward. */
export function parsePubSearch(json: unknown, near: { latitude: number; longitude: number } | null): FoundPub[] {
  const rows = Array.isArray(json) ? (json as NominatimRow[]) : [];
  const found: FoundPub[] = [];
  for (const r of rows) {
    if (r.class !== "amenity" || !KINDS.has(r.type ?? "") || !r.name || !r.osm_type || !r.osm_id) continue;
    const latitude = Number(r.lat);
    const longitude = Number(r.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const a = r.address ?? {};
    const town = a.city ?? a.town ?? a.village ?? a.suburb ?? a.county;
    found.push({
      osmId: `${r.osm_type}/${r.osm_id}`,
      name: r.name.slice(0, 80),
      place: [a.road, town, a.country].filter(Boolean).join(", "),
      latitude,
      longitude,
      distance: near ? Math.round(distanceM(near.latitude, near.longitude, latitude, longitude)) : null,
    });
  }
  if (near) found.sort((a, b) => a.distance! - b.distance!);
  return found.slice(0, MAX_RESULTS);
}

/** Pubs matching `name`, leaning toward `near`; [] on any failure. */
export async function searchPubs(name: string, near: { latitude: number; longitude: number } | null): Promise<FoundPub[]> {
  const params = new URLSearchParams({ q: name.trim() });
  if (near) {
    params.set("lat", String(near.latitude));
    params.set("lng", String(near.longitude));
  }
  try {
    const res = await fetch(`/api/beer/search?${params}`, { signal: AbortSignal.timeout(8000) });
    return res.ok ? ((await res.json()) as FoundPub[]) : [];
  } catch {
    return [];
  }
}
