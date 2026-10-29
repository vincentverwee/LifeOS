// Places by name from Nominatim (/api/beer/search): any venue, pubs and bars first (an
// airport bar can be tagged restaurant; see venues.ts). Client-safe: the picker calls
// searchPubs, the route uses parsePubSearch.

import { distanceM } from "@/lib/beer/nearby";
import { isVenue, venueLabel, venueRank } from "@/lib/beer/venues";

export type FoundPub = {
  osmId: string;
  name: string;
  /** "Pub", "Restaurant", … */
  kind: string;
  /** street, town and country, to tell same-named places apart */
  place: string;
  latitude: number;
  longitude: number;
  /** metres from the spot the search leaned toward, if any */
  distance: number | null;
};

/** Half the side of the box the search leans toward, in degrees (~50 km). */
export const PUB_SEARCH_VIEWBOX_DEG = 0.5;
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

/** Venues only (no streets, towns or benches); nearest first when there's a spot to lean toward, else pubs and bars first. */
export function parsePubSearch(json: unknown, near: { latitude: number; longitude: number } | null): FoundPub[] {
  const rows = Array.isArray(json) ? (json as NominatimRow[]) : [];
  const found: FoundPub[] = [];
  for (const r of rows) {
    if (!isVenue(r.class, r.type) || !r.name || !r.osm_type || !r.osm_id) continue;
    const latitude = Number(r.lat);
    const longitude = Number(r.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const a = r.address ?? {};
    const town = a.city ?? a.town ?? a.village ?? a.suburb ?? a.county;
    found.push({
      osmId: `${r.osm_type}/${r.osm_id}`,
      name: r.name.slice(0, 80),
      kind: r.type!,
      place: [a.road, town, a.country].filter(Boolean).join(", "),
      latitude,
      longitude,
      distance: near ? Math.round(distanceM(near.latitude, near.longitude, latitude, longitude)) : null,
    });
  }
  // Stable sort: without a spot, Nominatim's own relevance order stays within each rank.
  found.sort(near ? (a, b) => a.distance! - b.distance! : (a, b) => venueRank(a.kind) - venueRank(b.kind));
  return found.slice(0, MAX_RESULTS).map((f) => ({ ...f, kind: venueLabel(f.kind) }));
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
