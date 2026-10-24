import { MOCK_STATS, MOCK_TRIPS, getAllMockLocations } from './mock-data';
import { DashboardStats, Trip, TripSummary, Location } from '@/types';
import { isSupabaseConfigured } from './supabase/config';
import { createServerClient } from './supabase/server';

/**
 * Every trip column EXCEPT `route_geometry`.
 *
 * `route_geometry` is a full OSRM polyline (tens to hundreds of kB per trip), so `select('*')`
 * on the trips table can pull megabytes down a phone connection. Only the map views actually
 * draw a route; the dashboard stats and the statistics page just need dates and km, so they
 * select this list instead.
 */
const TRIP_SUMMARY_COLUMNS =
  'id, title, description, start_date, end_date, cover_image, route_preference, total_km, created_at, updated_at';

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured()) return MOCK_STATS;

  const supabase = createServerClient();
  const [{ data: trips, error: tripsError }, { data: locations, error: locationsError }] =
    await Promise.all([
      supabase.from('trips').select(TRIP_SUMMARY_COLUMNS),
      supabase.from('locations').select('country, city'),
    ]);
  if (tripsError) throw tripsError;
  if (locationsError) throw locationsError;

  const tripList = (trips ?? []) as unknown as TripSummary[];
  const countries = new Set((locations ?? []).map((l) => l.country).filter(Boolean));
  const cities = new Set((locations ?? []).map((l) => l.city).filter(Boolean));
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

export async function getRecentTrips(limit = 5): Promise<Trip[]> {
  if (!isSupabaseConfigured()) return MOCK_TRIPS.slice(0, limit);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data as Trip[];
}

/** Full trips, route geometry included — for the map pages, which draw the route lines. */
export async function getAllTrips(): Promise<Trip[]> {
  if (!isSupabaseConfigured()) return MOCK_TRIPS;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as Trip[];
}

/** Trips without their route geometry — for screens that only show titles, dates and km. */
export async function getAllTripSummaries(): Promise<TripSummary[]> {
  if (!isSupabaseConfigured()) return MOCK_TRIPS;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_SUMMARY_COLUMNS)
    .order('start_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as unknown as TripSummary[];
}

export async function getAllLocations(): Promise<Location[]> {
  if (!isSupabaseConfigured()) return getAllMockLocations();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('trip_id')
    .order('visit_order');
  if (error) throw error;
  return data as Location[];
}
