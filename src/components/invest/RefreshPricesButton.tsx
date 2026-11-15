"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshPrices } from "@/lib/actions/invest";

/** Fetches every fund's latest closes now (the cron does it every ~6 h anyway). */
export function RefreshPricesButton({ updated }: { updated: string | null }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      {updated && <span>Prices updated {updated}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await refreshPrices();
            setMessage(res.ok ? (res.failed.length ? `Couldn't update ${res.failed.join(", ")}.` : null) : res.error);
          })
        }
        className="btn btn-ghost -mx-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-xs"
      >
        <RefreshCw size={14} aria-hidden="true" className={pending ? "animate-spin" : ""} />
        {pending ? "Updating…" : "Refresh prices"}
      </button>
      {message && <span role="status">{message}</span>}
    </div>
  );
}
