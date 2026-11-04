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

const DAY_MS = 86_400_000;
const dayMs = (key: string) => Date.parse(`${key}T00:00:00Z`);

export interface VanTime {
  /** Days in the van (a trip counts its first and last day). */
  days: number;
  nights: number;
  /** Nights per calendar year (a night belongs to the year of its evening), oldest first. */
  byYear: { year: number; nights: number }[];
}

/**
 * Time spent in the van, from the van trips' dates. A trip still going (no end date yet, or
 * one in the future) counts up to today; one that hasn't started yet doesn't count.
 */
export function getVanTime(
  trips: Pick<TripSummary, 'with_van' | 'start_date' | 'end_date'>[],
  todayKey: string,
): VanTime {
  const today = dayMs(todayKey);
  const byYear = new Map<number, number>();
  let days = 0;
  let nights = 0;
  for (const trip of trips) {
    if (!trip.with_van || !trip.start_date) continue;
    const start = dayMs(trip.start_date);
    if (Number.isNaN(start) || start > today) continue;
    const plannedEnd = trip.end_date ? dayMs(trip.end_date) : today;
    const end = Math.min(Number.isNaN(plannedEnd) ? today : plannedEnd, today);
    if (end < start) continue;
    const tripNights = Math.round((end - start) / DAY_MS);
    days += tripNights + 1;
    nights += tripNights;
    for (let i = 0; i < tripNights; i++) {
      const year = new Date(start + i * DAY_MS).getUTCFullYear();
      byYear.set(year, (byYear.get(year) ?? 0) + 1);
    }
  }
  return {
    days,
    nights,
    byYear: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, n]) => ({ year, nights: n })),
  };
}

export interface VanCountry {
  country: string;
  stops: number;
  /** "YYYY-MM-DD" of the first stop there (its arrival, else its trip's start); null when undated. */
  firstVisit: string | null;
}

/** The countries the van's trips stopped in, first visited first (undated ones last). */
export function getVanCountries(
  trips: Pick<TripSummary, 'id' | 'with_van' | 'start_date'>[],
  locations: Pick<Location, 'trip_id' | 'country' | 'arrival_date'>[],
): VanCountry[] {
  const vanStart = new Map(trips.filter((t) => t.with_van).map((t) => [t.id, t.start_date]));
  const byCountry = new Map<string, VanCountry>();
  for (const loc of locations) {
    if (!loc.country || !vanStart.has(loc.trip_id)) continue;
    const date = loc.arrival_date ?? vanStart.get(loc.trip_id) ?? null;
    const entry = byCountry.get(loc.country) ?? { country: loc.country, stops: 0, firstVisit: null };
    entry.stops += 1;
    if (date && (!entry.firstVisit || date < entry.firstVisit)) entry.firstVisit = date;
    byCountry.set(loc.country, entry);
  }
  return [...byCountry.values()].sort((a, b) => {
    if (a.firstVisit && b.firstVisit) return a.firstVisit.localeCompare(b.firstVisit);
    if (a.firstVisit || b.firstVisit) return a.firstVisit ? -1 : 1;
    return a.country.localeCompare(b.country);
  });
}

const MILESTONES = [1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000];

export interface Milestone {
  /** The last milestone passed (0 before the first). */
  reached: number;
  next: number;
  /** 0–1, from `reached` to `next`. */
  progress: number;
}

/** Van km milestones: 1 000, 2 500, 5 000, 10 000, 25 000, 50 000, 100 000, then every 50 000. */
export function vanMilestone(km: number): Milestone {
  const value = Math.max(0, km);
  let reached = 0;
  let next = MILESTONES.find((m) => m > value);
  if (next === undefined) next = (Math.floor(value / 50_000) + 1) * 50_000;
  for (const m of MILESTONES) if (m <= value) reached = m;
  if (value >= 100_000) reached = Math.floor(value / 50_000) * 50_000;
  return { reached, next, progress: (value - reached) / (next - reached) };
}
