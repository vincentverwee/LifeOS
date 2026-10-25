'use server';

import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { Location, RoutePreference, TripSummary } from '@/lib/waypoint/types';
import { toLocation, toTripSummary } from '@/lib/waypoint/rows';
import { calculateRoute } from '@/lib/waypoint/routing/osrm';
import { parseDateKey } from '@/lib/format';

/**
 * Waypoint's data store. These used to be browser-side Supabase calls; they are server
 * actions now (reads go through src/lib/data/waypoint.ts in server pages). They throw on
 * bad input, so callers catch and show the message.
 * No revalidatePath: every Waypoint page is dynamic and the client pages keep their own state.
 */

export type CreateTripInput = {
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  route_preference: RoutePreference;
};

export type UpdateTripInput = Partial<CreateTripInput>;

export type CreateLocationInput = Omit<Location, 'id' | 'created_at' | 'updated_at' | 'visit_order'>;
export type UpdateLocationInput = Partial<Pick<Location, 'arrival_date' | 'departure_date' | 'notes'>>;
export type TripRoute = { total_km: number | null; route_geometry: GeoJSON.LineString | null };

const WITHOUT_GEOMETRY = { routeGeometry: true } as const;
const MAX_STOPS = 100;

function requireTitle(title: unknown): string {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) throw new Error('A trip needs a title.');
  if (trimmed.length > 120) throw new Error('Keep the title under 120 characters.');
  return trimmed;
}

function requirePreference(value: string): RoutePreference {
  if (value !== 'allow_tolls' && value !== 'avoid_tolls') {
    throw new Error(`Unknown route preference "${value}".`);
  }
  return value;
}

/** Cleared text fields arrive as "" — store those as null. Long text is cut off. */
function optionalText(value: string | null | undefined, max: number): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed ? trimmed.slice(0, max) : null;
}

/** "" / null -> null; anything else must be a real "YYYY-MM-DD". */
function optionalDate(value: string | null | undefined, label: string): Date | null {
  if (!value) return null;
  const key = parseDateKey(value);
  if (!key) throw new Error(`${label} isn't a valid date.`);
  return new Date(`${key}T00:00:00Z`);
}

function checkOrder(from: Date | null, to: Date | null, message: string) {
  if (from && to && to < from) throw new Error(message);
}

// --- Trips ---

export async function createTrip(input: CreateTripInput): Promise<TripSummary> {
  await requireAuth();
  const startDate = optionalDate(input.start_date, 'The start date');
  const endDate = optionalDate(input.end_date, 'The end date');
  checkOrder(startDate, endDate, "The end date can't be before the start date.");
  const row = await prisma.waypointTrip.create({
    data: {
      title: requireTitle(input.title),
      description: optionalText(input.description, 2000),
      startDate,
      endDate,
      routePreference: requirePreference(input.route_preference),
    },
    omit: WITHOUT_GEOMETRY,
  });
  return toTripSummary(row);
}

export async function updateTrip(id: string, input: UpdateTripInput): Promise<TripSummary> {
  await requireAuth();
  const current = await prisma.waypointTrip.findUnique({
    where: { id },
    select: { startDate: true, endDate: true },
  });
  if (!current) throw new Error('That trip no longer exists.');
  const startDate = input.start_date !== undefined ? optionalDate(input.start_date, 'The start date') : current.startDate;
  const endDate = input.end_date !== undefined ? optionalDate(input.end_date, 'The end date') : current.endDate;
  checkOrder(startDate, endDate, "The end date can't be before the start date.");

  const row = await prisma.waypointTrip.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: requireTitle(input.title) }),
      ...(input.description !== undefined && { description: optionalText(input.description, 2000) }),
      startDate,
      endDate,
      ...(input.route_preference !== undefined && {
        routePreference: requirePreference(input.route_preference),
      }),
    },
    omit: WITHOUT_GEOMETRY,
  });
  return toTripSummary(row);
}

export async function deleteTrip(id: string): Promise<void> {
  await requireAuth();
  await prisma.waypointTrip.deleteMany({ where: { id } });
}

/**
 * Recalculates the driving route through the trip's stops (in their stored order) and
 * saves it. Runs on the server from the stored stops, so the saved km and line always
 * match the database. Fewer than 2 stops clears the route. Returns null when the routing
 * service failed; the stored route is then left as it was.
 */
export async function recalculateTripRoute(tripId: string): Promise<TripRoute | null> {
  await requireAuth();
  const stops = await prisma.waypointLocation.findMany({
    where: { tripId },
    orderBy: { visitOrder: 'asc' },
    select: { latitude: true, longitude: true },
  });
  const points = stops.map((s) => ({ latitude: Number(s.latitude), longitude: Number(s.longitude) }));

  if (points.length < 2) {
    await prisma.waypointTrip.updateMany({
      where: { id: tripId },
      data: { totalKm: null, routeGeometry: Prisma.DbNull },
    });
    return { total_km: null, route_geometry: null };
  }

  const route = await calculateRoute(points);
  if (!route) return null;
  await prisma.waypointTrip.updateMany({
    where: { id: tripId },
    data: {
      totalKm: route.distanceKm,
      routeGeometry: route.geometry as unknown as Prisma.InputJsonValue,
    },
  });
  return { total_km: route.distanceKm, route_geometry: route.geometry };
}

// --- Locations ---

export async function createLocation(input: CreateLocationInput): Promise<Location> {
  await requireAuth();
  const name = optionalText(input.name, 200);
  if (!name) throw new Error('A stop needs a name.');
  const { latitude, longitude } = input;
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new Error("That place's coordinates look wrong.");
  }
  const arrivalDate = optionalDate(input.arrival_date, 'The arrival date');
  const departureDate = optionalDate(input.departure_date, 'The departure date');
  checkOrder(arrivalDate, departureDate, "Departure can't be before arrival.");

  // The new stop goes last; its position is decided here, not by the client.
  const row = await prisma.$transaction(async (tx) => {
    const trip = await tx.waypointTrip.findUnique({
      where: { id: input.trip_id },
      select: { _count: { select: { locations: true } } },
    });
    if (!trip) throw new Error('That trip no longer exists.');
    if (trip._count.locations >= MAX_STOPS) throw new Error(`A trip can have at most ${MAX_STOPS} stops.`);
    return tx.waypointLocation.create({
      data: {
        tripId: input.trip_id,
        name,
        latitude,
        longitude,
        country: optionalText(input.country, 100),
        city: optionalText(input.city, 100),
        arrivalDate,
        departureDate,
        notes: optionalText(input.notes, 2000),
        visitOrder: trip._count.locations,
      },
    });
  });
  return toLocation(row);
}

/** Removes a stop and renumbers the rest, in one transaction. */
export async function removeLocation(tripId: string, locationId: string): Promise<void> {
  await requireAuth();
  await prisma.$transaction(async (tx) => {
    await tx.waypointLocation.deleteMany({ where: { id: locationId, tripId } });
    const rest = await tx.waypointLocation.findMany({
      where: { tripId },
      orderBy: { visitOrder: 'asc' },
      select: { id: true, visitOrder: true },
    });
    for (const [i, loc] of rest.entries()) {
      if (loc.visitOrder !== i) await tx.waypointLocation.update({ where: { id: loc.id }, data: { visitOrder: i } });
    }
  });
}

/** Saves a new stop order. `orderedIds` must be exactly the trip's stops. */
export async function reorderLocations(tripId: string, orderedIds: string[]): Promise<void> {
  await requireAuth();
  if (!Array.isArray(orderedIds) || new Set(orderedIds).size !== orderedIds.length) {
    throw new Error("Couldn't save that order.");
  }
  await prisma.$transaction(async (tx) => {
    const current = await tx.waypointLocation.findMany({ where: { tripId }, select: { id: true } });
    const known = new Set(current.map((l) => l.id));
    if (current.length !== orderedIds.length || orderedIds.some((id) => !known.has(id))) {
      throw new Error('The stops changed meanwhile. Reload the page.');
    }
    for (const [i, id] of orderedIds.entries()) {
      await tx.waypointLocation.update({ where: { id }, data: { visitOrder: i } });
    }
  });
}

export async function updateLocation(id: string, input: UpdateLocationInput): Promise<void> {
  await requireAuth();
  const current = await prisma.waypointLocation.findUnique({
    where: { id },
    select: { arrivalDate: true, departureDate: true },
  });
  if (!current) throw new Error('That stop no longer exists.');
  const arrivalDate =
    input.arrival_date !== undefined ? optionalDate(input.arrival_date, 'The arrival date') : current.arrivalDate;
  const departureDate =
    input.departure_date !== undefined
      ? optionalDate(input.departure_date, 'The departure date')
      : current.departureDate;
  checkOrder(arrivalDate, departureDate, "Departure can't be before arrival.");

  await prisma.waypointLocation.updateMany({
    where: { id },
    data: {
      arrivalDate,
      departureDate,
      ...(input.notes !== undefined && { notes: optionalText(input.notes, 2000) }),
    },
  });
}
