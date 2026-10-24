"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTrip } from "@/lib/actions/trips";
import { encodePeriodKey } from "@/lib/period";
import { parseAmount } from "@/lib/format";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

export function NewTripForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const amount = parseAmount(budget);
    if (!name.trim()) return setError("Give the trip a name.");
    if (amount === null || amount <= 0) return setError("Enter a trip budget.");
    if (!startDate || !endDate) return setError("Pick a start and end date.");
    setError(null);
    startTransition(async () => {
      const result = await createTrip({ name, totalBudget: amount, startDate, endDate });
      if (result.ok) {
        router.push(`/budget/expenses?period=${encodeURIComponent(encodePeriodKey({ type: "trip", id: result.tripId }))}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div>
        <h2 className="font-medium text-foreground">New trip</h2>
        <p className="text-sm text-ink-muted">A separate budget with its own categories.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Weekend in Dublin"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
            }}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">To</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
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
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm tabular-nums text-foreground"
          />
        </label>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {isPending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <SheepSpinner size={18} />
            Creating…
          </span>
        ) : (
          "Create trip"
        )}
      </button>
    </div>
  );
}
