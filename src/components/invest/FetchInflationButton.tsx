"use client";

import { fetchInflation } from "@/lib/actions/invest";
import { ErrorLine, useRun } from "./formBits";

/** Fetches Belgium's inflation figures now instead of waiting for the cron. */
export function FetchInflationButton() {
  const { error, pending, run } = useRun();
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" disabled={pending} onClick={() => run(fetchInflation)} className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
        {pending ? "Fetching…" : "Fetch now"}
      </button>
      <ErrorLine error={error} />
    </div>
  );
}
