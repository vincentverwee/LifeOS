'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { Location, TripSummary } from '@/lib/waypoint/types';
import { toLocation, toTripSummary } from '@/lib/waypoint/rows';
import { calculateTripRoute } from '@/lib/waypoint/routing/osrm';
import type { RouteGeometry } from '@/lib/waypoint/routing/lines';
import { overviewOf } from '@/lib/waypoint/simplify';
import { dayKey, parseDateKey } from '@/lib/format';
import { validate as validateBudgetTrip, overlapError, strandedError } from '@/lib/budgetTrips';

/**
 * Waypoint's data store. These used to be browser-side Supabase calls; they are server
 * actions now (reads go through src/lib/data/waypoint.ts in server pages). They throw on
 * bad input, so callers catch and show the message.
 * Every change calls revalidate() so the client router cache (staleTimes.dynamic) doesn't
 * show old trips/km elsewhere; the client pages keep their own state, so this doesn't reset them.
 */

export type CreateTripInput = {
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  with_van?: boolean;
  /** Also create a budget Trip with this budget (planned trips; needs both dates). */
  budget?: number;
};

export type UpdateTripInput = Partial<CreateTripInput>;

export type CreateLocationInput = Omit<Location, 'id' | 'created_at' | 'updated_at' | 'visit_order' | 'arrived_by_plane'>;
export type UpdateLocationInput = Partial<Pick<Location, 'arrival_date' | 'departure_date' | 'notes'>>;
export type TripRoute = { total_km: number | null; route_geometry: RouteGeometry | null };

const WITHOUT_GEOMETRY = { routeGeometry: true, overviewGeometry: true } as const;
const MAX_STOPS = 100;

/** A message meant for the person (validation, clashes); anything else stays generic. */
class TripError extends Error {}

function requireTitle(title: unknown): string {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) throw new TripError('A trip needs a title.');
  if (trimmed.length > 120) throw new TripError('Keep the title under 120 characters.');
  return trimmed;
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
  if (!key) throw new TripError(`${label} isn't a valid date.`);
  return new Date(`${key}T00:00:00Z`);
}

function revalidate(budgetToo = false) {
  revalidatePath('/'); // hub shows total km
  revalidatePath('/waypoint', 'layout');
  if (budgetToo) {
    revalidatePath('/budget', 'layout');
  }
}

/** Budget trip names are capped at 60 characters; Waypoint titles at 120. */
const budgetName = (title: string) => title.slice(0, 60).trim();
const dateKey = (d: Date | null) => (d ? dayKey(d) : '');

function checkOrder(from: Date | null, to: Date | null, message: string) {
  if (from && to && to < from) throw new TripError(message);
}

// --- Trips ---

/**
 * Trip saves return their message instead of throwing: a production build hides a thrown
 * server action's message, and a budget trip clash has to be readable.
 */
export type TripSaveResult = { ok: true; trip: TripSummary } | { ok: false; error: string };

async function asResult(save: () => Promise<TripSummary>): Promise<TripSaveResult> {
  try {
    return { ok: true, trip: await save() };
  } catch (e) {
    if (e instanceof TripError) return { ok: false, error: e.message };
    console.error('Saving a Waypoint trip failed', e);
    return { ok: false, error: 'Saving failed. Try again.' };
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Creates the budget Trip for a planned trip, under the budget rules (name, amount, overlap). */
async function createLinkedBudget(
  tx: Tx,
  title: string,
  startDate: Date | null,
  endDate: Date | null,
  amount: number,
): Promise<string> {
  if (!startDate || !endDate) throw new TripError('A budget trip needs a start and end date.');
  const valid = validateBudgetTrip({
    name: budgetName(title),
    totalBudget: amount,
    startDate: dateKey(startDate),
    endDate: dateKey(endDate),
  });
  if (!valid.ok) throw new TripError(valid.error);
  const overlap = await overlapError(tx, valid.trip);
  if (overlap) throw new TripError(`Budget trip: ${overlap}`);
  return (await tx.trip.create({ data: valid.trip, select: { id: true } })).id;
}

export async function createTrip(input: CreateTripInput): Promise<TripSaveResult> {
  await requireAuth();
  return asResult(() => insertTrip(input));
}

export async function updateTrip(id: string, input: UpdateTripInput): Promise<TripSaveResult> {
  await requireAuth();
  return asResult(() => editTrip(id, input));
}

async function insertTrip(input: CreateTripInput): Promise<TripSummary> {
  const title = requireTitle(input.title);
  const startDate = optionalDate(input.start_date, 'The start date');
  const endDate = optionalDate(input.end_date, 'The end date');
  checkOrder(startDate, endDate, "The end date can't be before the start date.");
  const withBudget = input.budget !== undefined;

  const row = await prisma.$transaction(async (tx) => {
    const budgetTripId = withBudget
      ? await createLinkedBudget(tx, title, startDate, endDate, input.budget ?? 0)
      : null;
    return tx.waypointTrip.create({
      data: {
        title,
        description: optionalText(input.description, 2000),
        startDate,
        endDate,
        withVan: input.with_van === true,
        budgetTripId,
      },
      omit: WITHOUT_GEOMETRY,
    });
  });
  revalidate(withBudget);
  return toTripSummary(row);
}

async function editTrip(id: string, input: UpdateTripInput): Promise<TripSummary> {
  const current = await prisma.waypointTrip.findUnique({
    where: { id },
    select: { title: true, startDate: true, endDate: true, budgetTripId: true },
  });
  if (!current) throw new TripError('That trip no longer exists.');
  const startDate = input.start_date !== undefined ? optionalDate(input.start_date, 'The start date') : current.startDate;
  const endDate = input.end_date !== undefined ? optionalDate(input.end_date, 'The end date') : current.endDate;
  checkOrder(startDate, endDate, "The end date can't be before the start date.");
  const title = input.title !== undefined ? requireTitle(input.title) : current.title;
  const linked = current.budgetTripId;
  // A plan made without one can get its budget trip later from the same dialog.
  const addBudget = !linked && input.budget !== undefined;

  const row = await prisma.$transaction(async (tx) => {
    // Keep the linked budget trip's name and dates in step, under its own rules.
    if (linked) {
      const budget = await tx.trip.findUnique({ where: { id: linked }, select: { totalBudget: true } });
      if (budget) {
        if (!startDate || !endDate) throw new TripError('This trip has a budget trip, so it needs a start and end date.');
        const valid = validateBudgetTrip({
          name: budgetName(title),
          totalBudget: Number(budget.totalBudget),
          startDate: dateKey(startDate),
          endDate: dateKey(endDate),
        });
        if (!valid.ok) throw new TripError(valid.error);
        const overlap = await overlapError(tx, valid.trip, linked);
        if (overlap) throw new TripError(`Budget trip: ${overlap}`);
        const stranded = await strandedError(tx, linked, valid.trip.startDate, valid.trip.endDate);
        if (stranded) throw new TripError(`Budget trip: ${stranded}`);
        await tx.trip.update({
          where: { id: linked },
          data: { name: valid.trip.name, startDate: valid.trip.startDate, endDate: valid.trip.endDate },
        });
      }
    }
    const budgetTripId = addBudget
      ? await createLinkedBudget(tx, title, startDate, endDate, input.budget ?? 0)
      : undefined;
    return tx.waypointTrip.update({
      where: { id },
      data: {
        title,
        ...(budgetTripId && { budgetTripId }),
        ...(input.description !== undefined && { description: optionalText(input.description, 2000) }),
        startDate,
        endDate,
        ...(input.with_van !== undefined && { withVan: input.with_van === true }),
      },
      omit: WITHOUT_GEOMETRY,
    });
  });
  revalidate(!!linked || addBudget);
  return toTripSummary(row);
}

export async function deleteTrip(id: string): Promise<void> {
  await requireAuth();
  await prisma.waypointTrip.deleteMany({ where: { id } });
  // Its stickers went with it (cascade); their photos have nothing pointing at them now.
  await prisma.stickerPhoto.deleteMany({ where: { sticker: null } });
  revalidate();
}

/**
 * Recalculates the driving route through the trip's stops (in their stored order) and
 * saves it. Flown legs are left out: they split the line and their km don't count. Runs on the server from the stored stops, so the saved km and line always
 * match the database. Fewer than 2 stops clears the route. Returns null when the routing
 * service failed; the stored route is then left as it was.
 */
export async function recalculateTripRoute(tripId: string): Promise<TripRoute | null> {
  await requireAuth();
  const stops = await prisma.waypointLocation.findMany({
    where: { tripId },
    orderBy: { visitOrder: 'asc' },
    select: { latitude: true, longitude: true, arrivedByPlane: true },
  });
  const points = stops.map((s) => ({
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    byPlane: s.arrivedByPlane,
  }));

  if (points.length < 2) {
    await prisma.waypointTrip.updateMany({
      where: { id: tripId },
      data: { totalKm: null, routeGeometry: Prisma.DbNull, overviewGeometry: Prisma.DbNull },
    });
    revalidate();
    return { total_km: null, route_geometry: null };
  }

  const route = await calculateTripRoute(points);
  if (!route) return null;
  await prisma.waypointTrip.updateMany({
    where: { id: tripId },
    data: {
      totalKm: route.distanceKm,
      routeGeometry: route.geometry ? (route.geometry as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      // The thinned copy the overview maps read, saved together so they never disagree.
      overviewGeometry: route.geometry ? (overviewOf(route.geometry) as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });
  revalidate();
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
  revalidate();
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
  revalidate();
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
  revalidate();
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
  revalidate();
}

/** Marks the leg that arrives at this stop as flown (or driven again). */
export async function setLegByPlane(tripId: string, locationId: string, byPlane: boolean): Promise<void> {
  await requireAuth();
  await prisma.waypointLocation.updateMany({
    where: { id: locationId, tripId },
    data: { arrivedByPlane: byPlane === true },
  });
  revalidate();
}
