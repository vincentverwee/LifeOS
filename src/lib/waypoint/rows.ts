import type { WaypointLocation, WaypointTrip } from '@/generated/prisma/client';
import { dayKey } from '@/lib/format';
import type { RouteGeometry } from './routing/lines';
import type { Location, Trip, TripSummary } from './types';

/**
 * Prisma rows -> the snake_case shapes the Waypoint components were written against.
 *
 * Waypoint used to read Supabase rows directly, so every component speaks `start_date`,
 * `total_km`, `visit_order`… Mapping here keeps them untouched, and turns Decimals and Dates
 * into plain numbers/strings so the result can cross the server -> client boundary.
 */

const optionalDay = (value: Date | null) => (value ? dayKey(value) : null);

export function toTripSummary(row: Omit<WaypointTrip, 'routeGeometry'>): TripSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    start_date: optionalDay(row.startDate),
    end_date: optionalDay(row.endDate),
    cover_image: row.coverImage,
    total_km: row.totalKm === null ? null : Number(row.totalKm),
    with_van: row.withVan,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toTrip(row: WaypointTrip): Trip {
  return {
    ...toTripSummary(row),
    route_geometry: (row.routeGeometry ?? null) as unknown as RouteGeometry | null,
  };
}

export function toLocation(row: WaypointLocation): Location {
  return {
    id: row.id,
    trip_id: row.tripId,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    country: row.country,
    city: row.city,
    arrival_date: optionalDay(row.arrivalDate),
    departure_date: optionalDay(row.departureDate),
    notes: row.notes,
    visit_order: row.visitOrder,
    arrived_by_plane: row.arrivedByPlane,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/** "YYYY-MM-DD" (or empty) -> UTC-midnight Date for a @db.Date column. */
export function toDateColumn(value: string | null | undefined): Date | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
}
