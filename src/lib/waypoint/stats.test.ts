import { describe, expect, it } from 'vitest';
import { getVanStats, getYearlyStats } from './stats';
import type { TripSummary } from './types';

const trip = (id: string, start: string | null, km: number | null, withVan: boolean): TripSummary => ({
  id,
  title: id,
  description: null,
  start_date: start,
  end_date: null,
  cover_image: null,
  total_km: km,
  with_van: withVan,
  created_at: '',
  updated_at: '',
});

const trips = [
  trip('a', '2025-07-01', 1000, true),
  trip('b', '2025-09-01', 400, false),
  trip('c', '2026-04-01', 800, true),
  trip('d', null, 300, true), // undated: in the van total, not in a year
];

describe('getYearlyStats', () => {
  it('splits each year into van and other km', () => {
    expect(getYearlyStats(trips)).toEqual([
      { year: 2025, totalKm: 1400, tripsCount: 2, vanKm: 1000, vanTrips: 1 },
      { year: 2026, totalKm: 800, tripsCount: 1, vanKm: 800, vanTrips: 1 },
    ]);
  });
});

describe('getVanStats', () => {
  it('adds up every van trip, dated or not', () => {
    expect(getVanStats(trips)).toEqual({ km: 2100, trips: 3 });
    expect(getVanStats([trip('x', null, null, true)])).toEqual({ km: 0, trips: 1 });
  });
});

describe('trip filter', () => {
  it('reads ?trip= and ?person=, falling back to all', async () => {
    const { readTripFilter, keepTrip, tripFilterQuery } = await import('./tripFilter');
    const companions = [{ id: 'p1', name: 'Louise', tripIds: ['b'] }];
    const van = readTripFilter({ trip: 'van' }, companions);
    expect(trips.filter((t) => keepTrip(van, t)).map((t) => t.id)).toEqual(['a', 'c', 'd']);
    const louise = readTripFilter({ person: 'p1' }, companions);
    expect(trips.filter((t) => keepTrip(louise, t)).map((t) => t.id)).toEqual(['b']);
    expect(tripFilterQuery(louise)).toBe('?person=p1');
    expect(readTripFilter({ trip: 'nonsense', person: 'gone' }, companions)).toEqual({ kind: 'all' });
  });
});
