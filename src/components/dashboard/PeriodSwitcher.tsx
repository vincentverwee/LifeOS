"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Period } from "@/lib/data/periods";
import { encodePeriodKey } from "@/lib/period";
import { formatDate } from "@/lib/format";

type PeriodSwitcherProps = {
  periods: Period[];
  activeKey: string;
};

export function PeriodSwitcher({ periods, activeKey }: PeriodSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    // Phones: a compact pill that shares the title row. Larger screens: labelled select.
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="sr-only items-center justify-between text-ink-muted sm:not-sr-only sm:flex">
        Active period
        <Link href="/budget/settings" className="btn btn-ghost -mx-3 inline-flex min-h-9 px-3">
          + New
        </Link>
      </span>
      <select
        value={activeKey}
        onChange={(event) => {
          router.push(`${pathname}?period=${encodeURIComponent(event.target.value)}`);
        }}
        className="max-w-[52vw] truncate rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground sm:max-w-none sm:rounded-lg sm:py-2.5"
      >
        {periods.map((period) => {
          const key = encodePeriodKey(period);
          const typeLabel = period.type === "cycle" ? "Month" : "Trip";
          return (
            <option key={key} value={key}>
              {typeLabel === "Month" ? period.name : `Trip — ${period.name} (${formatDate(period.startDate)}–${formatDate(period.endDate)})`}
            </option>
          );
        })}
      </select>
    </label>
  );
}
