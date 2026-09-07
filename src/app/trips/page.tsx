'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TripCard } from '@/components/trips/TripCard';
import { TripDialog } from '@/components/trips/TripDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TripSummary } from '@/types';
import {
  CreateTripInput,
  createTrip,
  updateTrip,
  deleteTrip,
  getTripSummaries,
} from '@/lib/trips-store';
import { Plus, Route } from 'lucide-react';

export default function TripsPage() {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripSummary | null>(null);
  // Distinguishes "still fetching" from "genuinely no trips" -- without it the page flashed the
  // full "No trips yet" empty state on every visit before the query came back.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getTripSummaries().then((data) => {
      setTrips(data);
      setLoaded(true);
    });
  }, []);

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
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Trips</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loaded ? `${trips.length} trip${trips.length !== 1 ? 's' : ''} recorded` : ' '}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus size={16} />
            New trip
          </Button>
        </div>

        {!loaded ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-2xl" />
            ))}
          </div>
        ) : trips.length === 0 ? (
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
            {trips.map((trip, i) => (
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
    </AppShell>
  );
}
