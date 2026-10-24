import 'server-only';
import { prisma } from '@/lib/prisma';
import { toLocation, toTrip, toTripSummary } from '@/lib/waypoint/rows';
import { DashboardStats, Trip, TripSummary, Location } from '@/lib/waypoint/types';

/**
 * `route_geometry` is a full OSRM polyline (tens to hundreds of kB per trip), so loading it
 * for every trip can pull megabytes down a phone connection. Only the map views actually
 * draw a route; the dashboard stats and the statistics page just need dates and km, so they
 * leave it out.
 */
const WITHOUT_GEOMETRY = { routeGeometry: true } as const;

const NEWEST_FIRST = [{ startDate: { sort: 'desc', nulls: 'last' } }] as const;

export async function getDashboardStats(): Promise<DashboardStats> {
  const [trips, locations] = await Promise.all([
    prisma.waypointTrip.findMany({ omit: WITHOUT_GEOMETRY }),
    prisma.waypointLocation.findMany({ select: { country: true, city: true } }),
  ]);

  const tripList = trips.map(toTripSummary);
  const countries = new Set(locations.map((l) => l.country).filter(Boolean));
  const cities = new Set(locations.map((l) => l.city).filter(Boolean));
  const totalKm = tripList.reduce((sum, t) => sum + (t.total_km ?? 0), 0);

  const longestTrip = tripList.reduce<TripSummary | null>((longest, t) => {
    if (!t.total_km) return longest;
    if (!longest || t.total_km > (longest.total_km ?? 0)) return t;
    return longest;
  }, null);

  const latestTrip = tripList.reduce<TripSummary | null>((latest, t) => {
    if (!t.start_date) return latest;
    if (!latest || !latest.start_date || t.start_date > latest.start_date) return t;
    return latest;
  }, null);

  return {
    countries_visited: countries.size,
    cities_visited: cities.size,
    trips_count: tripList.length,
    total_km: totalKm,
    longest_trip_km: longestTrip?.total_km ?? 0,
    longest_trip_title: longestTrip?.title ?? null,
    latest_trip: latestTrip,
  };
}

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
