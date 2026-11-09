"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTrip } from "@/lib/actions/trips";
import { formatCurrencyShort, formatDate } from "@/lib/format";
import { NewTripForm, type EditableTrip } from "@/components/settings/NewTripForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export type TripRow = EditableTrip & { spent: number; expenseCount: number };

export function TripList({ trips }: { trips: TripRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (trips.length === 0) {
    return <p className="text-sm text-ink-muted">No trips yet.</p>;
  }

  function remove(trip: TripRow) {
    setError(null);
    startTransition(async () => {
      const result = await deleteTrip(trip.id);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-critical">{error}</p>}
      <ul className="card-list">
        {trips.map((trip) => (
          <li key={trip.id} className="p-3">
            {editingId === trip.id ? (
              <NewTripForm trip={trip} onDone={() => setEditingId(null)} />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{trip.name}</span>
                  <span className="text-xs text-ink-muted">
                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)} ·{" "}
                    {formatCurrencyShort(trip.spent)} of {formatCurrencyShort(trip.budget)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(trip.id)}
                  className="btn btn-ghost min-h-11 px-4 text-sm"
                >
                  Edit
                </button>
                <ConfirmButton
                  onConfirm={() => remove(trip)}
                  disabled={isPending}
                  confirmLabel={
                    trip.expenseCount > 0
                      ? `Delete + ${trip.expenseCount} ${trip.expenseCount === 1 ? "expense" : "expenses"}?`
                      : "Tap again to delete"
                  }
                  className="min-h-11 shrink-0 px-4 text-sm"
                >
                  Delete
                </ConfirmButton>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-muted">Deleting a trip also deletes its expenses. This can&apos;t be undone.</p>
    </div>
  );
}
