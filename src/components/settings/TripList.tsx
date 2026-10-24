"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTrip } from "@/lib/actions/trips";
import { formatCurrencyShort, formatDate } from "@/lib/format";
import { NewTripForm, type EditableTrip } from "@/components/settings/NewTripForm";

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
    const what =
      trip.expenseCount > 0
        ? ` and its ${trip.expenseCount} ${trip.expenseCount === 1 ? "expense" : "expenses"}`
        : "";
    if (!window.confirm(`Delete ${trip.name}${what}? This can't be undone.`)) return;
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
      <ul className="overflow-hidden rounded-xl border border-border bg-surface">
        {trips.map((trip) => (
          <li key={trip.id} className="border-b border-border p-3 last:border-b-0">
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
                  className="min-h-11 rounded-lg px-3 text-sm text-primary active:bg-surface-muted"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(trip)}
                  disabled={isPending}
                  className="min-h-11 rounded-lg px-3 text-sm text-critical active:bg-surface-muted disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
