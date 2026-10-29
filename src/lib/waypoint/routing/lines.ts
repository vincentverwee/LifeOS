/**
 * Helpers for routes that mix driving and flights.
 *
 * A trip with a flown leg in the middle has disconnected driving parts, stored as a
 * MultiLineString; older trips (and trips without flights) are a single LineString.
 * Flights themselves are never stored: they're drawn from the stops' coordinates.
 */

export type RouteGeometry = GeoJSON.LineString | GeoJSON.MultiLineString;

/** Any stored route -> its separate lines (empty for none). */
export function routeLines(geometry: RouteGeometry | null | undefined): GeoJSON.LineString[] {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry];
  return geometry.coordinates.map((coordinates) => ({ type: 'LineString', coordinates }));
}

/** Lines -> the geometry to store: one LineString when there's one part, null for none. */
export function joinLines(lines: GeoJSON.LineString[]): RouteGeometry | null {
  if (!lines.length) return null;
  if (lines.length === 1) return lines[0];
  return { type: 'MultiLineString', coordinates: lines.map((l) => l.coordinates) };
}

interface Point {
  latitude: number;
  longitude: number;
}

const EARTH_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in km, rounded to 0.1 like the OSRM distances. */
/** Great-circle distance in km, unrounded (Beer's Nearby needs metres). */
export function greatCircleKm(a: Point, b: Point): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function haversineKm(a: Point, b: Point): number {
  return Math.round(greatCircleKm(a, b) * 10) / 10;
}

/**
 * The flight from a to b as a great-circle arc (the curve a flight path shows on a map).
 * Longitudes are kept continuous, so a flight over the antimeridian doesn't wrap the globe.
 */
export function flightArc(a: Point, b: Point, steps = 48): GeoJSON.LineString {
  const lat1 = rad(a.latitude);
  const lng1 = rad(a.longitude);
  const lat2 = rad(b.latitude);
  const lng2 = rad(b.longitude);
  const d =
    2 *
    Math.asin(
      Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2)
    );
  if (d < 1e-9) {
    return { type: 'LineString', coordinates: [[a.longitude, a.latitude], [b.longitude, b.latitude]] };
  }

  const coordinates: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    let lng = deg(Math.atan2(y, x));
    const lat = deg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const prev = coordinates[coordinates.length - 1];
    if (prev) while (lng - prev[0] > 180) lng -= 360;
    if (prev) while (lng - prev[0] < -180) lng += 360;
    coordinates.push([lng, lat]);
  }
  return { type: 'LineString', coordinates };
}

interface Stop extends Point {
  trip_id: string;
  visit_order: number;
  arrived_by_plane: boolean;
}

/** Every flown leg among these stops (any number of trips) as an arc tagged with its trip. */
export function flightLegs<T extends Stop>(stops: T[]): { tripId: string; geometry: GeoJSON.LineString }[] {
  const byTrip = new Map<string, T[]>();
  for (const s of stops) {
    const list = byTrip.get(s.trip_id);
    if (list) list.push(s);
    else byTrip.set(s.trip_id, [s]);
  }
  const legs: { tripId: string; geometry: GeoJSON.LineString }[] = [];
  for (const [tripId, list] of byTrip) {
    list.sort((a, b) => a.visit_order - b.visit_order);
    for (let i = 1; i < list.length; i++) {
      if (list[i].arrived_by_plane) legs.push({ tripId, geometry: flightArc(list[i - 1], list[i]) });
    }
  }
  return legs;
}

/** Total flown km of one trip's stops (in visit order). */
export function flownKm(stops: (Point & { arrived_by_plane: boolean })[]): number {
  let km = 0;
  for (let i = 1; i < stops.length; i++) if (stops[i].arrived_by_plane) km += haversineKm(stops[i - 1], stops[i]);
  return Math.round(km * 10) / 10;
}
