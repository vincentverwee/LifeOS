"use client";

import { usePathname, useRouter } from "next/navigation";

type StudyPeriodSwitcherProps = {
  periods: { id: string; name: string }[];
  activeId: string;
};

/** Compact select that reloads the current page with `?period=`. */
export function StudyPeriodSwitcher({ periods, activeId }: StudyPeriodSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  if (periods.length < 2) return null;

  return (
    <label className="min-w-0">
      <span className="sr-only">Study period</span>
      <select
        value={activeId}
        onChange={(event) => router.push(`${pathname}?period=${encodeURIComponent(event.target.value)}`)}
        className="max-w-[52vw] truncate rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground sm:max-w-none"
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
