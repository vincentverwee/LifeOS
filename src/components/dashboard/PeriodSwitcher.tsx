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
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex items-center justify-between text-ink-muted">
        Active period
        <Link href="/budget/settings" className="text-primary">
          + New
        </Link>
      </span>
      <select
        value={activeKey}
        onChange={(event) => {
          router.push(`${pathname}?period=${encodeURIComponent(event.target.value)}`);
        }}
        className="rounded-lg border border-border bg-surface px-3 py-2 font-medium text-foreground"
      >
        {periods.map((period) => {
          const key = encodePeriodKey(period);
          const typeLabel = period.type === "cycle" ? "Month" : "Trip";
          return (
            <option key={key} value={key}>
              {typeLabel} — {period.name} ({formatDate(period.startDate)}–{formatDate(period.endDate)})
            </option>
          );
        })}
      </select>
    </label>
  );
}
