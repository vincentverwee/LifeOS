'use client';

import { useState } from 'react';
import { TripCard } from '@/components/waypoint/trips/TripCard';
import { TripDialog } from '@/components/waypoint/trips/TripDialog';
import { Button } from '@/components/waypoint/ui/button';
import { TripSummary } from '@/lib/waypoint/types';
import { CreateTripInput, createTrip, updateTrip, deleteTrip } from '@/lib/actions/waypoint';
import { Plus, Route } from 'lucide-react';

type VanFilter = 'all' | 'van' | 'novan';

const VAN_FILTERS: { value: VanFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'van', label: 'Van' },
  { value: 'novan', label: 'Without van' },
];

/** The interactive trips list. The server page passes the trips in, so the first paint has data. */
export function TripsList({ initialTrips }: { initialTrips: TripSummary[] }) {
  const [trips, setTrips] = useState<TripSummary[]>(initialTrips);
  const [vanFilter, setVanFilter] = useState<VanFilter>('all');
  const anyVan = trips.some((t) => t.with_van);
  const filter = anyVan ? vanFilter : 'all';
  const shown = filter === 'all' ? trips : trips.filter((t) => t.with_van === (filter === 'van'));
  const noun = filter === 'van' ? 'van trip' : filter === 'novan' ? 'trip without the van' : 'trip';
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
    } else {
      const created = await createTrip(data);
      setTrips((prev) => [created, ...prev]);
    }
  }

  async function handleDelete(id: string) {
    await deleteTrip(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Trips</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {`${shown.length} ${shown.length === 1 ? noun : noun.replace('trip', 'trips')}${filter === 'all' ? ' recorded' : ''}`}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus size={16} />
            New trip
          </Button>
        </div>

        {anyVan && (
          <div role="group" aria-label="Show" className="flex gap-1 rounded-full bg-surface-muted p-1">
            {VAN_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setVanFilter(option.value)}
                aria-pressed={filter === option.value}
                className={`btn flex min-h-11 flex-1 px-3 text-sm ${
                  filter === option.value ? 'bg-surface text-foreground shadow-sm' : 'text-ink-muted hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {trips.length === 0 ? (
          <div className="animate-fade-in flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
            <Route size={48} className="mb-4 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No trips yet</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Click &quot;New trip&quot; to start your first road trip
            </p>
            <Button onClick={openCreate} className="mt-6 gap-2" variant="outline">
              <Plus size={16} />
              Create first trip
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((trip, i) => (
              <TripCard
                key={trip.id}
                trip={trip}
                index={i}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <TripDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trip={editingTrip}
        onSave={handleSave}
      />
    </>
  );
}
