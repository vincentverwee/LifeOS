import 'server-only';
import { prisma } from '@/lib/prisma';
import { toLocation, toTrip, toTripSummary } from '@/lib/waypoint/rows';
import { Trip, TripSummary, Location } from '@/lib/waypoint/types';

/**
 * `route_geometry` is a full OSRM polyline (tens to hundreds of kB per trip), so loading it
 * for every trip can pull megabytes down a phone connection. Only the map views actually
 * draw a route; the stats and trip-list screens just need dates and km, so they leave it out.
 */
const WITHOUT_GEOMETRY = { routeGeometry: true } as const;

const NEWEST_FIRST = [{ startDate: { sort: 'desc', nulls: 'last' } }] as const;

/** Full trips, route geometry included — for the map pages, which draw the route lines. */
export async function getAllTrips(): Promise<Trip[]> {
  const rows = await prisma.waypointTrip.findMany({ orderBy: [...NEWEST_FIRST] });
  return rows.map(toTrip);
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
