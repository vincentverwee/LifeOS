"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SheepMark } from "@/components/icons/SheepMark";

/** Body of every error.tsx: what went wrong, try again, or go back. */
export function ErrorPanel({
  error,
  retry,
  backHref = "/",
  backLabel = "Home",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <SheepMark className="h-14 w-14 text-primary" />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {error.message === "Not logged in." ? "Your session expired. Log in again." : "The page couldn't load. Usually trying again helps."}
        </p>
        {error.digest && <p className="mt-1 font-mono text-xs text-ink-muted">{error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => retry()} className="btn btn-primary px-5 py-2.5">
          Try again
        </button>
        <Link href={backHref} className="btn btn-outline px-5 py-2.5">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
