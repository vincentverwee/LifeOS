'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { Trip, Location, RoutePreference } from '@/lib/waypoint/types';
import { toDateColumn, toLocation, toTrip } from '@/lib/waypoint/rows';

/**
 * Waypoint's data store. These used to be browser-side Supabase calls; they are now server
 * actions with the same names and signatures, so the client pages call them unchanged.
 * No revalidatePath: every Waypoint page is dynamic (`connection()`) or fetches on mount.
 */

export type CreateTripInput = {
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  route_preference: RoutePreference;
};

export type UpdateTripInput = Partial<CreateTripInput>;

export type CreateLocationInput = Omit<Location, 'id' | 'created_at' | 'updated_at'>;
export type UpdateLocationInput = Partial<
  Pick<Location, 'arrival_date' | 'departure_date' | 'notes' | 'visit_order'>
>;
export type UpdateTripRouteInput = { total_km: number; route_geometry: GeoJSON.LineString };

const NEWEST_FIRST = [{ startDate: { sort: 'desc', nulls: 'last' } }] as const;

function requireTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('A trip needs a title.');
  return trimmed;
}

function requirePreference(value: string): RoutePreference {
  if (value !== 'allow_tolls' && value !== 'avoid_tolls') {
    throw new Error(`Unknown route preference "${value}".`);
  }
  return value;
}

/** The trip form leaves cleared text fields as "" — store those as null. */
function emptyToNull(value: string | null | undefined): string | null {
  return value ? value : null;
}

// --- Trip CRUD ---

/** Full trips, route geometry included — for the all-trips map export, which draws every route. */
export async function getTrips(): Promise<Trip[]> {
  const rows = await prisma.waypointTrip.findMany({ orderBy: [...NEWEST_FIRST] });
  return rows.map(toTrip);
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const row = await prisma.waypointTrip.create({
    data: {
      title: requireTitle(input.title),
      description: emptyToNull(input.description),
      startDate: toDateColumn(input.start_date),
      endDate: toDateColumn(input.end_date),
      routePreference: requirePreference(input.route_preference),
    },
  });
  return toTrip(row);
}

export async function updateTrip(id: string, input: UpdateTripInput): Promise<Trip> {
  const row = await prisma.waypointTrip.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: requireTitle(input.title) }),
      ...(input.description !== undefined && { description: emptyToNull(input.description) }),
      ...(input.start_date !== undefined && { startDate: toDateColumn(input.start_date) }),
      ...(input.end_date !== undefined && { endDate: toDateColumn(input.end_date) }),
      ...(input.route_preference !== undefined && {
        routePreference: requirePreference(input.route_preference),
      }),
    },
  });
  return toTrip(row);
}

export async function deleteTrip(id: string): Promise<void> {
  await prisma.waypointTrip.delete({ where: { id } });
}

export async function getTripWithLocations(
  id: string
): Promise<{ trip: Trip; locations: Location[] }> {
  const row = await prisma.waypointTrip.findUnique({
    where: { id },
    include: { locations: { orderBy: { visitOrder: 'asc' } } },
  });
  if (!row) throw new Error('Trip not found.');
  const { locations, ...trip } = row;
  return { trip: toTrip(trip), locations: locations.map(toLocation) };
}

/** Persists the recalculated total distance and route line for a trip. */
export async function updateTripRoute(id: string, input: UpdateTripRouteInput): Promise<void> {
  await prisma.waypointTrip.update({
    where: { id },
    data: {
      totalKm: input.total_km,
      routeGeometry: input.route_geometry as unknown as Prisma.InputJsonValue,
    },
  });
}

// --- Location CRUD ---

export async function getAllLocations(): Promise<Location[]> {
  const rows = await prisma.waypointLocation.findMany({
    orderBy: [{ tripId: 'asc' }, { visitOrder: 'asc' }],
  });
  return rows.map(toLocation);
}

export async function createLocation(input: CreateLocationInput): Promise<Location> {
  const row = await prisma.waypointLocation.create({
    data: {
      tripId: input.trip_id,
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      country: input.country,
      city: input.city,
      arrivalDate: toDateColumn(input.arrival_date),
      departureDate: toDateColumn(input.departure_date),
      notes: emptyToNull(input.notes),
      visitOrder: input.visit_order,
    },
  });
  return toLocation(row);
}

export async function deleteLocation(id: string): Promise<void> {
  await prisma.waypointLocation.delete({ where: { id } });
}

export async function updateLocation(id: string, input: UpdateLocationInput): Promise<void> {
  await prisma.waypointLocation.update({
    where: { id },
    data: {
      ...(input.arrival_date !== undefined && { arrivalDate: toDateColumn(input.arrival_date) }),
      ...(input.departure_date !== undefined && {
        departureDate: toDateColumn(input.departure_date),
      }),
      ...(input.notes !== undefined && { notes: emptyToNull(input.notes) }),
      ...(input.visit_order !== undefined && { visitOrder: input.visit_order }),
    },
  });
}

/** Persists the full visit order for a trip after a reorder or removal. */
export async function reorderLocations(
  locations: Pick<Location, 'id' | 'visit_order'>[]
): Promise<void> {
  await prisma.$transaction(
    locations.map(({ id, visit_order }) =>
      prisma.waypointLocation.update({ where: { id }, data: { visitOrder: visit_order } })
    )
  );
}
