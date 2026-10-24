import { DashboardStats, TripSummary, Location } from '@/lib/waypoint/types';

export interface YearlyStats {
  year: number;
  totalKm: number;
  tripsCount: number;
}

export function getYearlyStats(trips: TripSummary[]): YearlyStats[] {
  const byYear = new Map<number, YearlyStats>();

  for (const trip of trips) {
    if (!trip.start_date) continue;
    const year = new Date(trip.start_date).getFullYear();
    const entry = byYear.get(year) ?? { year, totalKm: 0, tripsCount: 0 };
    entry.totalKm += trip.total_km ?? 0;
    entry.tripsCount += 1;
    byYear.set(year, entry);
  }

  return [...byYear.values()].sort((a, b) => a.year - b.year);
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

export interface TripBreakdownEntry {
  trip: TripSummary;
}

export function getTripBreakdown(trips: TripSummary[]): TripBreakdownEntry[] {
  return trips
    .map((trip) => ({ trip }))
    .sort((a, b) => (b.trip.start_date ?? '').localeCompare(a.trip.start_date ?? ''));
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
