'use client';

import { useState } from 'react';
import { TripCard } from '@/components/waypoint/trips/TripCard';
import { TripDialog } from '@/components/waypoint/trips/TripDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { TripSummary } from '@/lib/waypoint/types';
import { CreateTripInput, createTrip, updateTrip, deleteTrip } from '@/lib/actions/waypoint';
import { Plus } from 'lucide-react';
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
}: {
  initialTrips: TripSummary[];
  shownTrips: ShownTrips;
  companions: { id: string; name: string }[];
  /** Trip id -> its first sticker. */
  stickers?: Record<string, { photoId: string; cutout: boolean }>;
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
  const shown = trips.filter((t) => savedIds.has(t.id) || keepTrip(filter, t));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripSummary | null>(null);

  function openCreate() {
    setEditingTrip(null);
    setDialogOpen(true);
  }

  function openEdit(trip: TripSummary) {
    setEditingTrip(trip);
    setDialogOpen(true);
  }

  async function handleSave(data: CreateTripInput) {
    if (editingTrip) {
      const updated = await updateTrip(editingTrip.id, data);
      setTrips((prev) => prev.map((t) => (t.id === editingTrip.id ? updated : t)));
      setSavedIds((prev) => new Set(prev).add(updated.id));
    } else {
      const created = await createTrip(data);
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
            <button type="button" onClick={openCreate} className="btn btn-primary inline-flex min-h-11 shrink-0 px-5 text-sm font-semibold">
              <Plus size={16} aria-hidden="true" />
              New trip
            </button>
          }
        />

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
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
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
        defaultVan={filter.kind === 'van'}
      />
    </>
  );
}
