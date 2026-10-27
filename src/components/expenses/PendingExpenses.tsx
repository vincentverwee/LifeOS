"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  clearOutboxErrors,
  flushOutbox,
  onlineStore,
  readOutbox,
  readSyncFailed,
  removeFromOutbox,
  serverOutbox,
  serverSyncFailed,
  subscribeOutbox,
} from "@/lib/offline/outbox";

/** Expenses saved offline that haven't reached the server yet (src/lib/offline/outbox.ts). */
export function PendingExpenses() {
  const router = useRouter();
  const items = useSyncExternalStore(subscribeOutbox, readOutbox, serverOutbox);
  const online = useSyncExternalStore(...onlineStore);
  const syncFailed = useSyncExternalStore(subscribeOutbox, readSyncFailed, serverSyncFailed);
  const [syncing, setSyncing] = useState(false);

  if (items.length === 0) return null;

  async function syncNow() {
    setSyncing(true);
    clearOutboxErrors();
    try {
      if ((await flushOutbox()) > 0) router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <CloudOff size={16} aria-hidden="true" className="text-warning-text" />
          {items.length === 1 ? "1 expense waiting to sync" : `${items.length} expenses waiting to sync`}
        </h2>
        {online && (
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="btn btn-ghost -mr-3 inline-flex min-h-11 px-3 text-sm"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">
                {item.categoryName}
                <span className="text-ink-muted"> · {formatDate(item.date)}</span>
                {item.note && <span className="text-ink-muted"> · {item.note}</span>}
              </p>
              {item.error && <p className="text-xs text-critical">{item.error}</p>}
            </div>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(item.amount)}
            </span>
            {item.error && (
              <button
                type="button"
                onClick={() => removeFromOutbox(item.id)}
                aria-label={`Remove ${formatCurrency(item.amount)} ${item.categoryName}`}
                className="btn btn-ghost -mr-2 inline-flex h-11 w-11 shrink-0"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!online && <p className="text-xs text-ink-muted">They&apos;ll sync on their own when you&apos;re back online.</p>}
      {online && syncFailed && (
        // Online but the server didn't answer: logged out, or this page is from an older
        // version of the app (offline copy). A reload fixes both (it goes to /login if needed).
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-warning-text">Couldn&apos;t sync. Reload the app (or log in again) to send them.</p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="btn btn-outline inline-flex min-h-11 shrink-0 px-4 text-sm"
          >
            Reload
          </button>
        </div>
      )}
    </section>
  );
}
