import { DashboardStats, TripSummary, Location } from '@/lib/waypoint/types';
import { flownKm } from '@/lib/waypoint/routing/lines';

export interface YearlyStats {
  year: number;
  totalKm: number;
  tripsCount: number;
  /** The part of totalKm driven in the van. */
  vanKm: number;
  vanTrips: number;
}

export function getYearlyStats(trips: TripSummary[]): YearlyStats[] {
  const byYear = new Map<number, YearlyStats>();

  for (const trip of trips) {
    if (!trip.start_date) continue;
    const year = new Date(trip.start_date).getUTCFullYear(); // date-only = UTC midnight
    const entry = byYear.get(year) ?? { year, totalKm: 0, tripsCount: 0, vanKm: 0, vanTrips: 0 };
    entry.totalKm += trip.total_km ?? 0;
    entry.tripsCount += 1;
    if (trip.with_van) {
      entry.vanKm += trip.total_km ?? 0;
      entry.vanTrips += 1;
    }
    byYear.set(year, entry);
  }

  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

export interface VanStats {
  km: number;
  trips: number;
}

/** Everything driven in the van, dated or not. */
export function getVanStats(trips: Pick<TripSummary, 'with_van' | 'total_km'>[]): VanStats {
  const van = trips.filter((t) => t.with_van);
  return { km: van.reduce((sum, t) => sum + (t.total_km ?? 0), 0), trips: van.length };
}

export interface CountryStats {
  country: string;
  visits: number;
}

export function getCountryStats(locations: Location[]): CountryStats[] {
  const byCountry = new Map<string, { visits: number }>();

  for (const loc of locations) {
    if (!loc.country) continue;
    const entry = byCountry.get(loc.country) ?? { visits: 0 };
    entry.visits += 1;
    byCountry.set(loc.country, entry);
  }

  return [...byCountry.entries()]
    .map(([country, { visits }]) => ({ country, visits }))
    .sort((a, b) => b.visits - a.visits);
}

/**
 * Headline numbers for the dashboard and stats pages. Pure: pass the trips and locations the
 * page already loaded, so the page does not run the same queries twice.
 */
export function getDashboardStats(
  trips: TripSummary[],
  locations: Pick<Location, 'country' | 'city'>[],
): DashboardStats {
  const countries = new Set(locations.map((l) => l.country).filter(Boolean));
  const totalKm = trips.reduce((sum, t) => sum + (t.total_km ?? 0), 0);

  const longestTrip = trips.reduce<TripSummary | null>((longest, t) => {
    if (!t.total_km) return longest;
    if (!longest || t.total_km > (longest.total_km ?? 0)) return t;
    return longest;
  }, null);

  const latestTrip = trips.reduce<TripSummary | null>((latest, t) => {
    if (!t.start_date) return latest;
    if (!latest || !latest.start_date || t.start_date > latest.start_date) return t;
    return latest;
  }, null);

  return {
    countries_visited: countries.size,
    trips_count: trips.length,
    total_km: totalKm,
    longest_trip_km: longestTrip?.total_km ?? 0,
    longest_trip_title: longestTrip?.title ?? null,
    latest_trip: latestTrip,
  };
}

export interface FlightStats {
  flights: number;
  km: number;
}

/** Flown legs across all trips (kept out of the driven km): how many, and their straight-line km. */
export function getFlightStats(locations: Location[]): FlightStats {
  const byTrip = new Map<string, Location[]>();
  for (const loc of locations) byTrip.set(loc.trip_id, [...(byTrip.get(loc.trip_id) ?? []), loc]);

  let flights = 0;
  let km = 0;
  for (const stops of byTrip.values()) {
    stops.sort((a, b) => a.visit_order - b.visit_order);
    flights += stops.filter((s, i) => i > 0 && s.arrived_by_plane).length;
    km += flownKm(stops);
  }
  return { flights, km: Math.round(km) };
}
