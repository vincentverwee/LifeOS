'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

type Companion = { id: string; name: string };

/**
 * The map's "show" dropdown: all trips, van / without the van, or the trips with one
 * person. Sets ?trip=van|novan or ?person=<id> (one at a time); "All trips" clears both.
 */
export function TripFilter({
  companions,
  value,
  showVan,
  basePath,
}: {
  companions: Companion[];
  /** "", "van", "novan" or "person:<id>". */
  value: string;
  /** Offer the van options (some trip is in the van). */
  showVan: boolean;
  basePath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (companions.length === 0 && !showVan) return null;

  function go(next: string) {
    const query = next.startsWith('person:')
      ? `?person=${encodeURIComponent(next.slice('person:'.length))}`
      : next
        ? `?trip=${next}`
        : '';
    startTransition(() => router.push(`${basePath}${query}`));
  }

  return (
    <select
      aria-label="Show trips"
      value={value}
      disabled={pending}
      onChange={(e) => go(e.target.value)}
      className="min-h-11 max-w-[11rem] min-w-0 truncate rounded-full border border-border bg-surface px-4 text-sm text-foreground disabled:opacity-60 sm:max-w-[16rem]"
    >
      <option value="">All trips</option>
      {showVan && (
        <>
          <option value="van">Van trips</option>
          <option value="novan">Without the van</option>
        </>
      )}
      {companions.length > 0 && (
        <optgroup label="With…">
          {companions.map((c) => (
            <option key={c.id} value={`person:${c.id}`}>
              With {c.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
