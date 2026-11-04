// The map's ?trip= / ?person= filter, shared by the map page and its image export.

export type TripFilter =
  | { kind: 'all' }
  | { kind: 'van' | 'novan' }
  | { kind: 'person'; personId: string; name: string; tripIds: ReadonlySet<string> };

type Companion = { id: string; name: string; tripIds: string[] };

/** The cookie that remembers the dropdown's All / Van / Without van choice on this device. */
export const TRIP_FILTER_COOKIE = 'waypoint-map-filter';

type Kind = 'all' | 'van' | 'novan';
const isKind = (value: unknown): value is Kind => value === 'all' || value === 'van' || value === 'novan';

/**
 * Reads the search params, shared by the map and its export so both show the same trips.
 * Without a (known) choice in the URL: the last one picked on this device (`saved`, the
 * cookie), else van trips when there are any. With no van trip, van / without van mean all
 * (the dropdown hides them, and an old ?trip=van link would show nothing).
 */
export function readTripFilter(
  params: { trip?: string | string[]; person?: string | string[] },
  companions: Companion[],
  { anyVan, saved }: { anyVan: boolean; saved?: string }
): TripFilter {
  const person = companions.find((c) => c.id === params.person);
  if (person) return { kind: 'person', personId: person.id, name: person.name, tripIds: new Set(person.tripIds) };
  const kind = isKind(params.trip) ? params.trip : isKind(saved) ? saved : anyVan ? 'van' : 'all';
  return { kind: anyVan ? kind : 'all' };
}

export function keepTrip(filter: TripFilter, trip: { id: string; with_van: boolean }): boolean {
  if (filter.kind === 'van') return trip.with_van;
  if (filter.kind === 'novan') return !trip.with_van;
  if (filter.kind === 'person') return filter.tripIds.has(trip.id);
  return true;
}

/** "3 van trips" / "3 trips without the van" / "3 trips with Louise" / "3 trips" for a page subtitle. */
export function describeTripFilter(filter: TripFilter, count: number): string {
  const trips = count === 1 ? 'trip' : 'trips';
  if (filter.kind === 'van') return `${count} van ${trips}`;
  if (filter.kind === 'novan') return `${count} ${trips} without the van`;
  if (filter.kind === 'person') return `${count} ${trips} with ${filter.name}`;
  return `${count} ${trips}`;
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
