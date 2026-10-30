import 'server-only';
import { prisma } from '@/lib/prisma';
import { toLocation, toTrip, toTripSummary } from '@/lib/waypoint/rows';
import { simplifyLine } from '@/lib/waypoint/simplify';
import { joinLines, routeLines } from '@/lib/waypoint/routing/lines';
import { Trip, TripSummary, Location } from '@/lib/waypoint/types';
import { isUuid } from '@/lib/waypoint/uuid';

/**
 * `route_geometry` is a full OSRM polyline (tens to hundreds of kB per trip), so loading it
 * for every trip can pull megabytes down a phone connection. Only the map views actually
 * draw a route; the stats and trip-list screens just need dates and km, so they leave it out.
 */
const WITHOUT_GEOMETRY = { routeGeometry: true } as const;

const NEWEST_FIRST = [{ startDate: { sort: 'desc', nulls: 'last' } }] as const;

/**
 * Full trips with their route line — for the map pages. Maps of all trips at once pass
 * `simplify` (a tolerance in degrees, see simplifyLine): the lines are thinned to what's
 * visible at that zoom, a fraction of the size.
 */
export async function getAllTrips({ simplify }: { simplify?: number } = {}): Promise<Trip[]> {
  const rows = await prisma.waypointTrip.findMany({ orderBy: [...NEWEST_FIRST] });
  const trips = rows.map(toTrip);
  if (!simplify) return trips;
  return trips.map((t) =>
    t.route_geometry
      ? { ...t, route_geometry: joinLines(routeLines(t.route_geometry).map((l) => simplifyLine(l, simplify))) }
      : t
  );
}

/** Trips without their route geometry — for screens that only show titles, dates and km. */
export async function getAllTripSummaries(): Promise<TripSummary[]> {
  const rows = await prisma.waypointTrip.findMany({
    omit: WITHOUT_GEOMETRY,
    orderBy: [...NEWEST_FIRST],
  });
  return rows.map(toTripSummary);
}

export async function getAllLocations(): Promise<Location[]> {
  const rows = await prisma.waypointLocation.findMany({
    orderBy: [{ tripId: 'asc' }, { visitOrder: 'asc' }],
  });
  return rows.map(toLocation);
}

/** One trip with its stops in visit order, or null when it doesn't exist. */
export async function getTripWithLocations(
  id: string
): Promise<{ trip: Trip; locations: Location[] } | null> {
  if (!isUuid(id)) return null;
  const row = await prisma.waypointTrip.findUnique({
    where: { id },
    include: { locations: { orderBy: { visitOrder: 'asc' } } },
  });
  if (!row) return null;
  const { locations, ...trip } = row;
  return { trip: toTrip(trip), locations: locations.map(toLocation) };
}
