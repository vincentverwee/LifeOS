// The map's ?trip= / ?person= filter, shared by the map page and its image export.

export type TripFilter =
  | { kind: 'all' }
  | { kind: 'van' | 'novan' }
  | { kind: 'person'; personId: string; name: string; tripIds: ReadonlySet<string> };

type Companion = { id: string; name: string; tripIds: string[] };

/**
 * Reads the search params. Nothing (or anything unknown) means `fallback`: the map opens on
 * van trips when there are any, the export on all trips; "All trips" is an explicit ?trip=all.
 */
export function readTripFilter(
  params: { trip?: string | string[]; person?: string | string[] },
  companions: Companion[],
  fallback: 'all' | 'van' = 'all'
): TripFilter {
  const person = companions.find((c) => c.id === params.person);
  if (person) return { kind: 'person', personId: person.id, name: person.name, tripIds: new Set(person.tripIds) };
  if (params.trip === 'all' || params.trip === 'van' || params.trip === 'novan') return { kind: params.trip };
  return { kind: fallback };
}

export function keepTrip(filter: TripFilter, trip: { id: string; with_van: boolean }): boolean {
  if (filter.kind === 'van') return trip.with_van;
  if (filter.kind === 'novan') return !trip.with_van;
  if (filter.kind === 'person') return filter.tripIds.has(trip.id);
  return true;
}

/** The query string that recreates it, always explicit (the default differs per page). */
export function tripFilterQuery(filter: TripFilter): string {
  if (filter.kind === 'person') return `?person=${encodeURIComponent(filter.personId)}`;
  return `?trip=${filter.kind}`;
}

/** The dropdown's value: "all", "van", "novan" or "person:<id>". */
export function tripFilterValue(filter: TripFilter): string {
  return filter.kind === 'person' ? `person:${filter.personId}` : filter.kind;
}
