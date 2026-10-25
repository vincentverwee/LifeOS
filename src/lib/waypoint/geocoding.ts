export interface GeocodingResult {
  name: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    country_code?: string;
  };
}

/** Searches places through our own /api/waypoint/geocode proxy (see that route for why). */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(`/api/waypoint/geocode?q=${encodeURIComponent(query.trim())}`, { signal });
  if (!res.ok) return [];
  return res.json();
}

export function extractCity(result: GeocodingResult): string {
  return (
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.display_name.split(',')[0]
  );
}

export function extractCountry(result: GeocodingResult): string {
  return result.address?.country ?? '';
}
