import { haversineKm, joinLines, type RouteGeometry } from './lines';

const OSRM_BASE_URL = 'https://router.project-osrm.org';
const TIMEOUT_MS = 10_000;

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  distanceKm: number;
  geometry: GeoJSON.LineString;
  /** Distance in km between each consecutive pair of input points, in order. */
  legsKm: number[];
}

/**
 * Calculates the real driving route through an ordered list of points using the
 * public OSRM demo server (fastest car route; it can't avoid tolls, so trips don't offer it).
 *
 * Never throws: a timeout, network error or unexpected answer returns null.
 */
export async function calculateRoute(points: RoutePoint[]): Promise<RouteResult | null> {
  if (points.length < 2) return null;

  const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(';');
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const route = data.routes[0];
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      geometry: route.geometry as GeoJSON.LineString,
      legsKm: route.legs.map((leg: { distance: number }) => Math.round((leg.distance / 1000) * 10) / 10),
    };
  } catch {
    return null;
  }
}

export interface TripRoutePoint extends RoutePoint {
  /** The leg from the previous point to this one was flown. Ignored on the first point. */
  byPlane?: boolean;
}

export interface TripRouteResult {
  /** Driven km only; flights are kept out. */
  distanceKm: number;
  flownKm: number;
  /** The driving parts (a MultiLineString when a flight splits them), null when nothing is driven. */
  geometry: RouteGeometry | null;
  /** Km of each leg in order, flights included (great-circle distance). */
  legsKm: number[];
}

/**
 * A trip's route where some legs were flown: the stops are split into driving runs at every
 * flight, and each run with 2+ stops is routed by OSRM. Null when any of those calls fails.
 */
export async function calculateTripRoute(points: TripRoutePoint[]): Promise<TripRouteResult | null> {
  if (points.length < 2) return null;

  // Driving runs: consecutive points joined by car.
  const runs: TripRoutePoint[][] = [[points[0]]];
  for (const p of points.slice(1)) {
    if (p.byPlane) runs.push([p]);
    else runs[runs.length - 1].push(p);
  }

  const driven = await Promise.all(runs.map((run) => (run.length >= 2 ? calculateRoute(run) : null)));
  if (runs.some((run, i) => run.length >= 2 && !driven[i])) return null;

  const legsKm: number[] = [];
  runs.forEach((run, i) => {
    if (i > 0) legsKm.push(haversineKm(runs[i - 1][runs[i - 1].length - 1], run[0]));
    legsKm.push(...(driven[i]?.legsKm ?? []));
  });
  const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 10) / 10;

  return {
    distanceKm: sum(driven.map((r) => r?.distanceKm ?? 0)),
    flownKm: sum(runs.slice(1).map((run, i) => haversineKm(runs[i][runs[i].length - 1], run[0]))),
    geometry: joinLines(driven.flatMap((r) => (r ? [r.geometry] : []))),
    legsKm,
  };
}
