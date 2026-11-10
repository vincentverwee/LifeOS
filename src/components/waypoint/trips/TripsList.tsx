'use client';

import { useState } from 'react';
import { TripCard } from '@/components/waypoint/trips/TripCard';
import { TripDialog } from '@/components/waypoint/trips/TripDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { TripSummary } from '@/lib/waypoint/types';
import { CreateTripInput, createTrip, updateTrip, deleteTrip } from '@/lib/actions/waypoint';
import { CalendarClock, Plus } from 'lucide-react';
import { daysUntil, isPlanned } from '@/lib/waypoint/stats';
import { TripFilter } from '@/components/waypoint/map/TripFilter';
import { describeTripFilter, keepTrip, tripFilterValue, type TripFilter as TripFilterValue } from '@/lib/waypoint/tripFilter';

/** The page's trip choice as plain data (a Set can't cross to the client). */
export type ShownTrips =
  | { kind: 'all' | 'van' | 'novan' }
  | { kind: 'person'; personId: string; name: string; tripIds: string[] };

/**
 * The interactive trips list. The server page passes the trips in, so the first paint has
 * data, and the All / Van / Without van / With… choice shared by every Waypoint page.
 */
export function TripsList({
  initialTrips,
  shownTrips,
  companions,
  stickers = {},
  todayKey,
}: {
  initialTrips: TripSummary[];
  shownTrips: ShownTrips;
  companions: { id: string; name: string }[];
  /** Trip id -> its first sticker. */
  stickers?: Record<string, { photoId: string; cutout: boolean }>;
  /** Trips starting after it are plans: their own group on top, whatever the filter. */
  todayKey: string;
}) {
  const [trips, setTrips] = useState<TripSummary[]>(initialTrips);
  const anyVan = trips.some((t) => t.with_van);
  const filter: TripFilterValue =
    shownTrips.kind === 'person'
      ? { ...shownTrips, tripIds: new Set(shownTrips.tripIds) }
      : { kind: anyVan ? shownTrips.kind : 'all' };
  // Trips created or edited on this visit stay in view even when they don't match the
  // filter (a new trip isn't tagged with the person yet), so a save never looks lost.
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());
  const planned = trips
    .filter((t) => isPlanned(t, todayKey))
    .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''));
  const shown = trips.filter((t) => !isPlanned(t, todayKey) && (savedIds.has(t.id) || keepTrip(filter, t)));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripSummary | null>(null);

  function openCreate() {
    setEditingTrip(null);
    setPlanning(false);
    setDialogOpen(true);
  }

  function openPlan() {
    setEditingTrip(null);
    setPlanning(true);
    setDialogOpen(true);
  }

  function openEdit(trip: TripSummary) {
    setEditingTrip(trip);
    setPlanning(false);
    setDialogOpen(true);
  }

  async function handleSave(data: CreateTripInput) {
    if (editingTrip) {
      const result = await updateTrip(editingTrip.id, data);
      if (!result.ok) throw new Error(result.error); // the dialog shows it
      const updated = result.trip;
      setTrips((prev) => prev.map((t) => (t.id === editingTrip.id ? updated : t)));
      setSavedIds((prev) => new Set(prev).add(updated.id));
    } else {
      const result = await createTrip(data);
      if (!result.ok) throw new Error(result.error);
      const created = result.trip;
      setTrips((prev) => [created, ...prev]);
      setSavedIds((prev) => new Set(prev).add(created.id));
    }
  }

  async function handleDelete(id: string) {
    await deleteTrip(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Trips"
          subtitle={describeTripFilter(filter, shown.length)}
          back={{ href: '/waypoint', label: 'Waypoint' }}
          action={
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={openPlan} className="btn btn-outline inline-flex min-h-11 shrink-0 px-4 text-sm">
                <CalendarClock size={16} aria-hidden="true" />
                Plan
              </button>
              <button type="button" onClick={openCreate} className="btn btn-primary inline-flex min-h-11 shrink-0 px-5 text-sm font-semibold">
                <Plus size={16} aria-hidden="true" />
                New trip
              </button>
            </div>
          }
        />

        {planned.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="section-title">Planned</h2>
            <ul className="flex flex-col gap-3">
              {planned.map((trip) => {
                const days = daysUntil(trip.start_date ?? todayKey, todayKey);
                return (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    countdown={days === 1 ? 'Tomorrow' : `In ${days} days`}
                  />
                );
              })}
            </ul>
          </section>
        )}

        <div>
          <TripFilter
            companions={companions}
            value={tripFilterValue(filter)}
            showVan={anyVan}
            basePath="/waypoint/trips"
          />
        </div>

        {trips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
            <p>No trips yet. Start with your first road trip.</p>
            <button type="button" onClick={openCreate} className="btn btn-primary mt-3 inline-flex min-h-11 px-5 text-sm font-semibold">
              New trip
            </button>
          </div>
        ) : shown.length === 0 ? (
          planned.length > 0 && trips.length === planned.length ? null : <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
            No trips match this choice. Pick another one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onEdit={openEdit}
                onDelete={handleDelete}
                sticker={stickers[trip.id]}
              />
            ))}
          </ul>
        )}
      </div>

      <TripDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trip={editingTrip}
        onSave={handleSave}
        defaultVan={planning || filter.kind === 'van'}
        planning={planning}
      />
    </>
  );
}
