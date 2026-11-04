import { describe, expect, it } from 'vitest';
import { getVanCountries, getVanStats, getVanTime, getYearlyStats, vanMilestone } from './stats';
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
  it('reads ?trip= and ?person=, then the saved choice, then van trips', async () => {
    const { readTripFilter, keepTrip, tripFilterQuery } = await import('./tripFilter');
    const companions = [{ id: 'p1', name: 'Louise', tripIds: ['b'] }];
    const withVan = { anyVan: true };
    const van = readTripFilter({ trip: 'van' }, companions, withVan);
    expect(trips.filter((t) => keepTrip(van, t)).map((t) => t.id)).toEqual(['a', 'c', 'd']);
    const louise = readTripFilter({ person: 'p1' }, companions, withVan);
    expect(trips.filter((t) => keepTrip(louise, t)).map((t) => t.id)).toEqual(['b']);
    expect(tripFilterQuery(louise)).toBe('?person=p1');
    // Unknown values fall back like no value: van trips while there are any.
    expect(readTripFilter({ trip: 'nonsense', person: 'gone' }, companions, withVan)).toEqual({ kind: 'van' });
    expect(readTripFilter({}, companions, withVan)).toEqual({ kind: 'van' });
    expect(readTripFilter({ trip: 'all' }, companions, withVan)).toEqual({ kind: 'all' });
    // The last pick on this device wins over the default, the URL over both.
    expect(readTripFilter({}, companions, { anyVan: true, saved: 'all' })).toEqual({ kind: 'all' });
    expect(readTripFilter({ trip: 'novan' }, companions, { anyVan: true, saved: 'all' })).toEqual({ kind: 'novan' });
    expect(readTripFilter({}, companions, { anyVan: true, saved: 'junk' })).toEqual({ kind: 'van' });
    // No van trip at all: van / without van mean all.
    expect(readTripFilter({ trip: 'van' }, companions, { anyVan: false })).toEqual({ kind: 'all' });
    expect(readTripFilter({}, companions, { anyVan: false, saved: 'novan' })).toEqual({ kind: 'all' });
    expect(tripFilterQuery({ kind: 'all' })).toBe('?trip=all');
  });
});

describe('describeTripFilter', () => {
  it('names the choice with a count', async () => {
    const { describeTripFilter } = await import('./tripFilter');
    expect(describeTripFilter({ kind: 'van' }, 3)).toBe('3 van trips');
    expect(describeTripFilter({ kind: 'van' }, 1)).toBe('1 van trip');
    expect(describeTripFilter({ kind: 'novan' }, 2)).toBe('2 trips without the van');
    expect(describeTripFilter({ kind: 'person', personId: 'p', name: 'Louise', tripIds: new Set() }, 1)).toBe('1 trip with Louise');
    expect(describeTripFilter({ kind: 'all' }, 4)).toBe('4 trips');
  });
});

describe('getVanTime', () => {
  const dated = (start: string | null, end: string | null, withVan = true) => ({ with_van: withVan, start_date: start, end_date: end });
  it('counts nights per year, caps at today and skips trips not started', () => {
    const time = getVanTime(
      [
        dated('2025-12-30', '2026-01-02'), // 3 nights: 2 in 2025, 1 in 2026
        dated('2026-11-01', null), // still going: up to today
        dated('2026-12-01', '2026-12-05'), // not started yet
        dated('2026-05-01', '2026-05-03', false), // not in the van
        dated(null, null),
      ],
      '2026-11-04',
    );
    expect(time.nights).toBe(6);
    expect(time.days).toBe(8);
    expect(time.byYear).toEqual([
      { year: 2025, nights: 2 },
      { year: 2026, nights: 4 },
    ]);
  });
});

describe('getVanCountries', () => {
  it('lists the van trips\' countries, first visited first', () => {
    const vanTrips = [
      { id: 'v1', with_van: true, start_date: '2025-07-01' },
      { id: 'v2', with_van: true, start_date: '2026-04-01' },
      { id: 'o', with_van: false, start_date: '2024-01-01' },
    ];
    const stop = (trip_id: string, country: string | null, arrival_date: string | null = null) => ({ trip_id, country, arrival_date });
    expect(
      getVanCountries(vanTrips, [
        stop('v2', 'Spain', '2026-04-03'),
        stop('v1', 'France'),
        stop('v2', 'France', '2026-04-02'),
        stop('o', 'Italy'),
        stop('v1', null),
      ]),
    ).toEqual([
      { country: 'France', stops: 2, firstVisit: '2025-07-01' },
      { country: 'Spain', stops: 1, firstVisit: '2026-04-03' },
    ]);
  });
});

describe('vanMilestone', () => {
  it('steps through the milestones, then every 50 000', () => {
    expect(vanMilestone(0)).toEqual({ reached: 0, next: 1000, progress: 0 });
    expect(vanMilestone(7500)).toEqual({ reached: 5000, next: 10000, progress: 0.5 });
    expect(vanMilestone(10000)).toMatchObject({ reached: 10000, next: 25000 });
    expect(vanMilestone(120000)).toMatchObject({ reached: 100000, next: 150000 });
  });
});
