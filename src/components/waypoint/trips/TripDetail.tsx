'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LocationList } from '@/components/waypoint/trips/LocationList';
import { LocationSearch } from '@/components/waypoint/trips/LocationSearch';
import { TripDialog } from '@/components/waypoint/trips/TripDialog';
import { MapWrapper } from '@/components/waypoint/map/MapWrapper';
import { Button } from '@/components/waypoint/ui/button';
import { Badge } from '@/components/waypoint/ui/badge';
import { Separator } from '@/components/waypoint/ui/separator';
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
import { CalendarDays, Navigation, Pencil, ArrowLeft, MapPin, ImageDown, Plane } from 'lucide-react';

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
}: {
  initialTrip: Trip;
  initialLocations: Location[];
  /** "Who came along" (People), rendered by the server page. */
  people?: React.ReactNode;
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
    const updated = await updateTrip(trip.id, data);
    setTrip((prev) => ({ ...prev, ...updated }));
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

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back + header */}
        <div className="flex items-start gap-2 sm:gap-4">
          <Button asChild variant="ghost" size="icon" className="-ml-3 shrink-0 sm:mt-1 sm:ml-0">
            <Link href="/waypoint/trips" aria-label="All trips">
              <ArrowLeft size={18} />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold text-foreground">{trip.title}</h2>
                {trip.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{trip.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {trip.start_date && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays size={12} />
                      {formatDate(trip.start_date)}
                      {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                    </span>
                  )}
                  {!!trip.total_km && locations.length >= 2 && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Navigation size={10} />
                      {trip.total_km.toLocaleString()} km
                    </Badge>
                  )}
                  {flown > 0 && (
                    <Badge variant="secondary" className="gap-1 text-xs" title="Flown, not counted in the km driven">
                      <Plane size={10} />
                      {flown.toLocaleString()} km
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {/* Icon-only on phones, so the trip title keeps its room. */}
                <Button asChild variant="outline" size="sm" className="w-11 gap-2 px-0 sm:w-auto sm:px-4">
                  <Link href={`/waypoint/trips/${id}/export`} aria-label="Export">
                    <ImageDown size={16} />
                    <span className="hidden sm:inline">Export</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-11 gap-2 px-0 sm:w-auto sm:px-4"
                  onClick={() => setEditOpen(true)}
                  aria-label="Edit"
                >
                  <Pencil size={16} />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {people}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: locations */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              <h3 className="font-semibold">
                Locations
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({locations.length})
                </span>
              </h3>
            </div>

            <LocationSearch tripId={id} onAdd={addLocation} />

            {error && <p className="text-sm text-destructive">{error}</p>}

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
              />
            </div>
          </div>

          {/* Right: map */}
          <div className="space-y-3">
            <h3 className="font-semibold">
              Route
              {routing && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Calculating…
                </span>
              )}
              {!routing && routeFailed && (
                <span className="ml-2 text-xs font-normal text-destructive">
                  Couldn&apos;t calculate the route; it updates after the next change.
                </span>
              )}
            </h3>
            <MapWrapper
              className="h-[min(400px,55svh)] lg:h-[500px]"
              locations={locations}
              routeGeometry={displayedRouteGeometry}
            />
            {locations.length < 2 && (
              <p className="text-center text-xs text-muted-foreground">
                Add at least 2 locations to see the route
              </p>
            )}
          </div>
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
