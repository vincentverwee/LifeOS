"use client";

import { useState, useTransition } from "react";
import { logSubscription, skipSubscription } from "@/lib/actions/subscriptions";
import { describeRenewal } from "@/lib/subscriptions/schedule";
import { formatCurrency } from "@/lib/format";
import type { SubscriptionRow } from "@/lib/data/subscriptions";

/** Renewals to confirm on Budget Today: Log (the price, or another amount) or Skip. */
export function DueSubscriptions({ due, todayKey }: { due: SubscriptionRow[]; todayKey: string }) {
  // Rows leave at once; the server's next render brings a later renewal back if it's also past.
  const [done, setDone] = useState<string[]>([]);
  const rows = due.filter((s) => !done.includes(`${s.id}:${s.nextDueOn}`));
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 font-medium text-foreground">Subscriptions to confirm</h2>
      <ul className="overflow-hidden rounded-xl border border-border bg-surface">
        {rows.map((s) => (
          <DueRow
            key={`${s.id}:${s.nextDueOn}`}
            subscription={s}
            todayKey={todayKey}
            onDone={() => setDone((prev) => [...prev, `${s.id}:${s.nextDueOn}`])}
          />
        ))}
      </ul>
    </section>
  );
}

function DueRow({ subscription: s, todayKey, onDone }: { subscription: SubscriptionRow; todayKey: string; onDone: () => void }) {
  const [other, setOther] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => ReturnType<typeof skipSubscription>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      // "Already done" means another tap or device got there first: gone either way.
      if (result.ok || result.error === "Already done.") onDone();
      else setError(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-tag-${s.category.color})` }} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{s.name}</span>
          <span className="text-xs text-ink-muted">Renewed {describeRenewal(s.nextDueOn, todayKey)}</span>
        </span>
        <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">{formatCurrency(s.amount)}</span>
      </div>

      {other !== null ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => logSubscription(s.id, s.nextDueOn, other));
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={other}
            onChange={(e) => setOther(e.target.value)}
            inputMode="decimal"
            aria-label={`Amount charged for ${s.name}`}
            placeholder={String(s.amount).replace(".", ",")}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono tabular-nums text-foreground"
          />
          <button type="submit" disabled={isPending} className="btn btn-primary min-h-11 px-4 text-sm font-semibold">
            Log
          </button>
          <button type="button" onClick={() => setOther(null)} className="btn btn-ghost min-h-11 px-3 text-sm">
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => logSubscription(s.id, s.nextDueOn))}
            className="btn btn-primary min-h-11 flex-1 px-4 text-sm font-semibold"
          >
            Log {formatCurrency(s.amount)}
          </button>
          <button type="button" disabled={isPending} onClick={() => setOther("")} className="btn btn-outline min-h-11 px-4 text-sm">
            Other amount
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => skipSubscription(s.id, s.nextDueOn))}
            className="btn btn-ghost min-h-11 px-3 text-sm"
          >
            Skip
          </button>
        </div>
      )}
      {error && <p className="text-sm text-critical">{error}</p>}
    </li>
  );
}
