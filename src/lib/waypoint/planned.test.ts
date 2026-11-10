import { describe, expect, it } from 'vitest';
import { daysUntil, hasStarted, isPlanned, journalOnly } from './stats';

describe('planned trips', () => {
  const today = '2026-11-10';

  it('a trip starting after today is planned', () => {
    expect(isPlanned({ start_date: '2026-11-11' }, today)).toBe(true);
    expect(isPlanned({ start_date: '2026-11-10' }, today)).toBe(false);
    expect(isPlanned({ start_date: '2026-10-01' }, today)).toBe(false);
  });

  it('undated trips count as started', () => {
    expect(hasStarted({ start_date: null }, today)).toBe(true);
  });

  it('journalOnly drops planned trips and their stops', () => {
    const trips = [
      { id: 'a', start_date: '2026-06-01' },
      { id: 'b', start_date: '2026-12-01' },
    ];
    const locations = [{ trip_id: 'a' }, { trip_id: 'b' }, { trip_id: 'b' }];
    const out = journalOnly(trips, locations, today);
    expect(out.trips.map((t) => t.id)).toEqual(['a']);
    expect(out.locations).toEqual([{ trip_id: 'a' }]);
  });

  it('counts days until the start', () => {
    expect(daysUntil('2026-11-22', today)).toBe(12);
    expect(daysUntil('2026-11-11', today)).toBe(1);
  });
});
