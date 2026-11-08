import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { toLocation, toTrip, toTripSummary } from '@/lib/waypoint/rows';
import { OVERVIEW_TOLERANCE, overviewOf, simplifyLine } from '@/lib/waypoint/simplify';
import { Prisma } from '@/generated/prisma/client';
import type { RouteGeometry } from '@/lib/waypoint/routing/lines';
import { joinLines, routeLines } from '@/lib/waypoint/routing/lines';
import { Trip, TripSummary, Location } from '@/lib/waypoint/types';
import { isUuid } from '@/lib/waypoint/uuid';

/**
 * `route_geometry` is a full OSRM polyline (tens to hundreds of kB per trip), so loading it
 * for every trip can pull megabytes down a phone connection. Only the map views actually
 * draw a route; the stats and trip-list screens just need dates and km, so they leave it out.
 */
const WITHOUT_GEOMETRY = { routeGeometry: true, overviewGeometry: true } as const;

const NEWEST_FIRST = [{ startDate: { sort: 'desc', nulls: 'last' } }] as const;

/**
 * Every trip with its route line, for the maps of all trips. With `simplify` ≥
 * OVERVIEW_TOLERANCE (the dashboard and big map) it reads only the stored thinned copy
 * (`overviewGeometry`, ~50 m), never the full routes: those were ~8.5 MB of Supabase
 * egress per visit, the copy is ~0.5 MB. A finer `simplify` (the image export, done by
 * hand now and then) or none reads the full routes and thins them here.
 */
export async function getAllTrips({ simplify }: { simplify?: number } = {}): Promise<Trip[]> {
  if (!simplify || simplify < OVERVIEW_TOLERANCE) {
    const rows = await prisma.waypointTrip.findMany({ omit: { overviewGeometry: true }, orderBy: [...NEWEST_FIRST] });
    const trips = rows.map(toTrip);
    if (!simplify) return trips;
    return trips.map((t) =>
      t.route_geometry
        ? { ...t, route_geometry: joinLines(routeLines(t.route_geometry).map((l) => simplifyLine(l, simplify))) }
        : t
    );
  }
  await fillMissingOverviews();
  const rows = await prisma.waypointTrip.findMany({ omit: { routeGeometry: true }, orderBy: [...NEWEST_FIRST] });
  return rows.map(({ overviewGeometry, ...row }) => {
    const overview = (overviewGeometry ?? null) as unknown as RouteGeometry | null;
    return {
      ...toTripSummary(row),
      route_geometry:
        overview && simplify && simplify > OVERVIEW_TOLERANCE
          ? joinLines(routeLines(overview).map((l) => simplifyLine(l, simplify)))
          : overview,
    };
  });
}

/**
 * Trips with a route but no overview yet (saved before the column existed, or imported):
 * made once from the full route and stored. Usually finds nothing, at the cost of one
 * tiny query.
 */
async function fillMissingOverviews() {
  const missing = await prisma.waypointTrip.findMany({
    where: { overviewGeometry: { equals: Prisma.DbNull }, NOT: { routeGeometry: { equals: Prisma.DbNull } } },
    select: { id: true, routeGeometry: true },
  });
  for (const { id, routeGeometry } of missing) {
    const overview = overviewOf(routeGeometry as unknown as RouteGeometry);
    await prisma.waypointTrip.updateMany({
      where: { id, overviewGeometry: { equals: Prisma.DbNull } },
      data: { overviewGeometry: overview ? (overview as unknown as Prisma.InputJsonValue) : Prisma.DbNull },
    });
  }
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

export type WaypointGlance = { totalKm: number; trips: number; latest: string | null; van: boolean };

/** The Home tile, van-first: the van's km and trips once any trip is in the van, else every trip.
 *  Cached per request so the tile and its mascot's mood share one load. */
export const getWaypointGlance = cache(async (): Promise<WaypointGlance> => {
  const all = await getAllTripSummaries(); // newest first
  const vanTrips = all.filter((t) => t.with_van);
  const trips = vanTrips.length > 0 ? vanTrips : all;
  return {
    totalKm: trips.reduce((sum, t) => sum + (t.total_km ?? 0), 0),
    trips: trips.length,
    latest: trips[0]?.title ?? null,
    van: vanTrips.length > 0,
  };
});
