"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTrip, updateTrip } from "@/lib/actions/trips";
import { encodePeriodKey } from "@/lib/period";
import { parseAmount } from "@/lib/format";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

export type EditableTrip = {
  id: string;
  name: string;
  budget: number;
  /** "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
};

type NewTripFormProps = {
  /** edit this trip instead of creating one */
  trip?: EditableTrip;
  onDone?: () => void;
};

const input = "rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground";

export function NewTripForm({ trip, onDone }: NewTripFormProps) {
  const router = useRouter();
  const [name, setName] = useState(trip?.name ?? "");
  const [budget, setBudget] = useState(trip ? String(trip.budget).replace(".", ",") : "");
  const [startDate, setStartDate] = useState(trip?.startDate ?? "");
  const [endDate, setEndDate] = useState(trip?.endDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const amount = parseAmount(budget);
    if (!name.trim()) return setError("Give the trip a name.");
    if (amount === null || amount <= 0) return setError("Enter a trip budget.");
    if (!startDate || !endDate) return setError("Pick a start and end date.");
    setError(null);
    const fields = { name, totalBudget: amount, startDate, endDate };
    startTransition(async () => {
      if (trip) {
        const result = await updateTrip({ id: trip.id, ...fields });
        if (!result.ok) return setError(result.error);
        onDone?.();
        router.refresh();
        return;
      }
      const result = await createTrip(fields);
      if (result.ok) {
        router.push(`/budget/add?period=${encodeURIComponent(encodePeriodKey({ type: "trip", id: result.tripId }))}`);
      } else {
        setError(result.error);
      }
    });
  }

  const fields = (
    <div className="grid grid-cols-2 gap-2">
      <label className="col-span-2 flex flex-col gap-1">
        <span className="text-xs text-ink-muted">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Weekend in Dublin"
          className={input}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-ink-muted">From</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
          }}
          className={input}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-ink-muted">To</span>
        <input
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => setEndDate(e.target.value)}
          className={input}
        />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        <span className="text-xs text-ink-muted">Budget</span>
        <input
          type="text"
          inputMode="decimal"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="300"
          className={`${input} font-mono tabular-nums`}
        />
      </label>
    </div>
  );

  const saveButton = (
    <button
      type="button"
      onClick={submit}
      disabled={isPending}
      className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
    >
      {isPending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <SheepSpinner size={18} />
          Saving…
        </span>
      ) : trip ? (
        "Save trip"
      ) : (
        "Create trip"
      )}
    </button>
  );

  if (trip) {
    return (
      <div className="flex flex-col gap-3">
        {fields}
        {error && <p className="text-sm text-critical">{error}</p>}
        <div className="flex gap-2">
          {saveButton}
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl border border-border px-4 py-3 text-sm text-ink-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div>
        <h2 className="font-medium text-foreground">New trip</h2>
        <p className="text-sm text-ink-muted">A separate budget for a few days away.</p>
      </div>
      {fields}
      {error && <p className="text-sm text-critical">{error}</p>}
      <div className="flex">{saveButton}</div>
    </div>
  );
}
