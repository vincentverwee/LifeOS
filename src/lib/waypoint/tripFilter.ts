// The map's ?trip= / ?person= filter, shared by the map page and its image export.

export type TripFilter =
  | { kind: 'all' }
  | { kind: 'van' | 'novan' }
  | { kind: 'person'; personId: string; name: string; tripIds: ReadonlySet<string> };

type Companion = { id: string; name: string; tripIds: string[] };

/** Reads the search params; an unknown person or value means all trips. */
export function readTripFilter(
  params: { trip?: string | string[]; person?: string | string[] },
  companions: Companion[]
): TripFilter {
  const person = companions.find((c) => c.id === params.person);
  if (person) return { kind: 'person', personId: person.id, name: person.name, tripIds: new Set(person.tripIds) };
  if (params.trip === 'van' || params.trip === 'novan') return { kind: params.trip };
  return { kind: 'all' };
}

export function keepTrip(filter: TripFilter, trip: { id: string; with_van: boolean }): boolean {
  if (filter.kind === 'van') return trip.with_van;
  if (filter.kind === 'novan') return !trip.with_van;
  if (filter.kind === 'person') return filter.tripIds.has(trip.id);
  return true;
}

/** The query string that recreates it ("" for all trips). */
export function tripFilterQuery(filter: TripFilter): string {
  if (filter.kind === 'person') return `?person=${encodeURIComponent(filter.personId)}`;
  if (filter.kind === 'van' || filter.kind === 'novan') return `?trip=${filter.kind}`;
  return '';
}

/** The dropdown's value: "", "van", "novan" or "person:<id>". */
export function tripFilterValue(filter: TripFilter): string {
  return filter.kind === 'person' ? `person:${filter.personId}` : filter.kind === 'all' ? '' : filter.kind;
}
