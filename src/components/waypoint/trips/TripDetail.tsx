'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LocationList } from '@/components/waypoint/trips/LocationList';
import { LocationSearch } from '@/components/waypoint/trips/LocationSearch';
import { TripStickers } from '@/components/waypoint/trips/TripStickers';
import type { Sticker } from '@/lib/waypoint/stickers';
import { TripDialog } from '@/components/waypoint/trips/TripDialog';
import { MapWrapper } from '@/components/waypoint/map/MapWrapper';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/waypoint/ui/badge';
import { Trip, Location } from '@/lib/waypoint/types';
import {
  updateTrip,
  recalculateTripRoute,
  CreateTripInput,
  CreateLocationInput,
  createLocation,
  removeLocation as removeLocationAction,
  updateLocation,
  reorderLocations,
  setLegByPlane,
} from '@/lib/actions/waypoint';
import { flownKm } from '@/lib/waypoint/routing/lines';
import { Caravan, Pencil, ImageDown, Plane, Wallet } from 'lucide-react';
import { daysUntil, isPlanned } from '@/lib/waypoint/stats';
import { formatCurrency } from '@/lib/format';

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "YYYY-MM-DD" (a date-only value) -> "12 Jul 2026", never shifted by the viewer's timezone. */
function formatDate(key: string) {
  return dayFormatter.format(new Date(`${key}T00:00:00Z`));
}

const errorMessage = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Something went wrong.');

/** The ordered stops and how each was reached: the route only changes when this does (not on note/date edits). */
const routeKeyOf = (locations: Location[]) =>
  locations.map((l, i) => (i > 0 && l.arrived_by_plane ? `${l.id}:plane` : l.id)).join('|');

/** Interactive trip page. The server page loads the trip, so the first paint has data. */
export function TripDetail({
  initialTrip,
  initialLocations,
  people,
  stickers = [],
  todayKey,
  budgetTrip = null,
}: {
  initialTrip: Trip;
  initialLocations: Location[];
  /** "Who came along" (People), rendered by the server page. */
  people?: React.ReactNode;
  /** Its stickers (from the server; refreshed after each sticker change). */
  stickers?: Sticker[];
  todayKey: string;
  /** The budget trip made alongside it (planned trips). */
  budgetTrip?: { name: string; totalBudget: number } | null;
}) {
  const id = initialTrip.id;
  const [trip, setTrip] = useState<Trip>(initialTrip);
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [editOpen, setEditOpen] = useState(false);
  const [routing, setRouting] = useState(false);
  const [routeFailed, setRouteFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The order the stored route was calculated for. A stored route matches the stored stops,
  // so the first visit doesn't recalculate (or rewrite) anything.
  const routedKey = useRef<string | null>(
    initialTrip.route_geometry || initialLocations.length < 2 ? routeKeyOf(initialLocations) : null
  );
  const routeKey = routeKeyOf(locations);

  useEffect(() => {
    if (routeKey === routedKey.current) return;
    let cancelled = false;
    setRouting(true);
    setRouteFailed(false);
    // Server actions run in order, so this sees the reorder/removal that changed the key.
    recalculateTripRoute(id)
      .then((route) => {
        if (cancelled) return;
        if (!route) {
          setRouteFailed(true);
          return;
        }
        routedKey.current = routeKey;
        setTrip((prev) => ({ ...prev, ...route }));
      })
      .catch(() => !cancelled && setRouteFailed(true))
      .finally(() => !cancelled && setRouting(false));
    return () => {
      cancelled = true;
    };
  }, [id, routeKey]);

  /** Runs one change at a time; on failure puts the stops back and shows why. */
  async function mutate(next: Location[] | null, action: () => Promise<unknown>) {
    const previous = locations;
    setError(null);
    setBusy(true);
    // Start the action before re-rendering, so it is dispatched ahead of the route recalculation.
    const pending = action();
    if (next) setLocations(next);
    try {
      await pending;
    } catch (e) {
      setLocations(previous);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleEditSave(data: CreateTripInput) {
    const result = await updateTrip(trip.id, data);
    if (!result.ok) throw new Error(result.error); // the dialog shows it
    setTrip((prev) => ({ ...prev, ...result.trip }));
  }

  async function addLocation(loc: CreateLocationInput) {
    setError(null);
    setBusy(true);
    try {
      const created = await createLocation(loc);
      setLocations((prev) => [...prev, created]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function removeLocation(locId: string) {
    const next = locations.filter((l) => l.id !== locId).map((l, i) => ({ ...l, visit_order: i }));
    return mutate(next, () => removeLocationAction(id, locId));
  }

  function move(locId: string, direction: -1 | 1) {
    const idx = locations.findIndex((l) => l.id === locId);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= locations.length) return;
    const swapped = [...locations];
    [swapped[idx], swapped[target]] = [swapped[target], swapped[idx]];
    const next = swapped.map((l, i) => ({ ...l, visit_order: i }));
    return mutate(next, () => reorderLocations(id, next.map((l) => l.id)));
  }

  function toggleLeg(locId: string) {
    const loc = locations.find((l) => l.id === locId);
    if (!loc) return;
    const byPlane = !loc.arrived_by_plane;
    const next = locations.map((l) => (l.id === locId ? { ...l, arrived_by_plane: byPlane } : l));
    return mutate(next, () => setLegByPlane(id, locId, byPlane));
  }

  function updateDates(locId: string, arrival: string, departure: string) {
    const arrival_date = arrival || null;
    const departure_date = departure || null;
    const next = locations.map((l) => (l.id === locId ? { ...l, arrival_date, departure_date } : l));
    return mutate(next, () => updateLocation(locId, { arrival_date, departure_date }));
  }

  function updateNotes(locId: string, notes: string) {
    const notesValue = notes || null;
    const next = locations.map((l) => (l.id === locId ? { ...l, notes: notesValue } : l));
    return mutate(next, () => updateLocation(locId, { notes: notesValue }));
  }

  const displayedRouteGeometry = locations.length < 2 ? null : trip.route_geometry;
  const flown = flownKm(locations);
  // Starts after today = a plan: km are an estimate, nothing to stick or tag yet.
  const planned = isPlanned(trip, todayKey);
  const daysToGo = planned && trip.start_date ? daysUntil(trip.start_date, todayKey) : 0;

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <PageHeader
            title={<span className="block truncate">{trip.title}</span>}
            subtitle={trip.description}
            back={{ href: '/waypoint/trips', label: 'Trips' }}
            action={
              <div className="flex shrink-0 gap-2">
                {/* Icon-only on phones, so the trip title keeps its room. */}
                <Link
                  href={`/waypoint/trips/${id}/export`}
                  aria-label="Export"
                  className="btn btn-outline inline-flex h-11 w-11 text-sm sm:w-auto sm:px-4"
                >
                  <ImageDown size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">Export</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  aria-label="Edit"
                  className="btn btn-outline inline-flex h-11 w-11 text-sm sm:w-auto sm:px-4"
                >
                  <Pencil size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              </div>
            }
          />
          {planned && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Badge variant="secondary">Planned · {daysToGo === 1 ? 'starts tomorrow' : `starts in ${daysToGo} days`}</Badge>
              {budgetTrip && (
                <Link href="/budget/settings" className="inline-flex items-center gap-1 text-ink-muted underline-offset-2 hover:underline">
                  <Wallet size={13} aria-hidden="true" />
                  Budget trip: {budgetTrip.name} · <span className="tabular-nums">{formatCurrency(budgetTrip.totalBudget)}</span>
                </Link>
              )}
            </div>
          )}
          {(trip.start_date || (!!trip.total_km && locations.length >= 2) || trip.with_van || flown > 0) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              {trip.start_date && (
                <span>
                  {formatDate(trip.start_date)}
                  {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                </span>
              )}
              {!!trip.total_km && locations.length >= 2 && (
                <span className="tabular-nums">
                  {planned ? `≈ ${trip.total_km.toLocaleString()} km planned` : `${trip.total_km.toLocaleString()} km`}
                </span>
              )}
              {flown > 0 && (
                <span className="flex items-center gap-1 tabular-nums" title="Flown, not counted in the km driven">
                  <Plane size={12} aria-hidden="true" />
                  {flown.toLocaleString()} km flown
                </span>
              )}
              {trip.with_van && (
                <Badge variant="secondary" className="gap-1">
                  <Caravan size={12} aria-hidden="true" />
                  Van
                </Badge>
              )}
            </div>
          )}
        </div>

        {!planned && people}

        {!planned && (
          <TripStickers
            tripId={id}
            stickers={stickers}
            stops={locations.map(({ id: stopId, name, city }) => ({ id: stopId, name, city }))}
          />
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: locations */}
          <section className="flex min-w-0 flex-col gap-3">
            <h2 className="section-title">
              Stops
              {locations.length > 0 && (
                <span className="ml-2 text-sm font-normal text-ink-muted tabular-nums">{locations.length}</span>
              )}
            </h2>

            <LocationSearch tripId={id} onAdd={addLocation} />

            {error && <p className="text-sm text-critical">{error}</p>}

            <div>
              <LocationList
                locations={locations}
                onRemove={removeLocation}
                onMoveUp={(locId) => move(locId, -1)}
                onMoveDown={(locId) => move(locId, 1)}
                onToggleLeg={toggleLeg}
                onUpdateDates={updateDates}
                onUpdateNotes={updateNotes}
                disabled={busy}
                stickerStops={stickers.reduce<Record<string, { photoId: string; cutout: boolean }[]>>((byStop, s) => {
                  if (s.locationId) (byStop[s.locationId] ??= []).push({ photoId: s.photoId, cutout: s.cutout });
                  return byStop;
                }, {})}
              />
            </div>
          </section>

          {/* Right: map */}
          <section className="flex min-w-0 flex-col gap-3">
            <h2 className="section-title">
              Route
              {routing && (
                <span className="ml-2 text-xs font-normal text-ink-muted">
                  Calculating…
                </span>
              )}
              {!routing && routeFailed && (
                <span className="ml-2 text-xs font-normal text-critical">
                  Couldn&apos;t calculate the route; it updates after the next change.
                </span>
              )}
            </h2>
            <MapWrapper
              className="h-[min(400px,55svh)] lg:h-[500px]"
              locations={locations}
              routeGeometry={displayedRouteGeometry}
            />
            {locations.length < 2 && (
              <p className="text-center text-sm text-ink-muted">Add at least 2 stops to see the route.</p>
            )}
          </section>
        </div>
      </div>

      <TripDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        trip={trip}
        onSave={handleEditSave}
      />
    </>
  );
}
