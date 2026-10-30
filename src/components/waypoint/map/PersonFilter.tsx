'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

type Companion = { id: string; name: string };

/** "Trips with …" dropdown above the map: picking someone sets ?person=, "All trips" clears it. */
export function PersonFilter({
  companions,
  selected,
  basePath,
}: {
  companions: Companion[];
  selected: string | null;
  basePath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (companions.length === 0) return null;

  return (
    <select
      aria-label="Show trips with"
      value={selected ?? ''}
      disabled={pending}
      onChange={(e) => {
        const id = e.target.value;
        startTransition(() => router.push(id ? `${basePath}?person=${encodeURIComponent(id)}` : basePath));
      }}
      className="min-h-11 max-w-[11rem] min-w-0 truncate rounded-full border border-border bg-surface px-4 text-sm text-foreground disabled:opacity-60 sm:max-w-[16rem]"
    >
      <option value="">All trips</option>
      {companions.map((c) => (
        <option key={c.id} value={c.id}>
          With {c.name}
        </option>
      ))}
    </select>
  );
}
