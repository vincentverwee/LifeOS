import type { RouteGeometry } from './routing/lines';

export interface Trip {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
  total_km: number | null;
  /** The driving parts; a MultiLineString when a flight splits them (see routing/lines.ts). */
  route_geometry: RouteGeometry | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  trip_id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string | null;
  city: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  notes: string | null;
  visit_order: number;
  /** The leg from the previous stop to this one was flown. */
  arrived_by_plane: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * A trip minus its `route_geometry` — the (potentially very large) OSRM polyline(s).
 *
 * The list/stats screens never draw a route, so they fetch this narrower row set instead of
 * `select('*')`; on a phone that's the difference between a few kB and several MB per page load.
 * `Trip` is assignable to `TripSummary`, so a full trip can be passed anywhere this is accepted.
 */
export type TripSummary = Omit<Trip, 'route_geometry'>;

export interface DashboardStats {
  countries_visited: number;
  trips_count: number;
  total_km: number;
  longest_trip_km: number;
  longest_trip_title: string | null;
  latest_trip: TripSummary | null;
}
