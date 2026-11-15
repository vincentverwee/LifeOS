import Link from "next/link";

export const RANGES = [
  { key: "6m", label: "6M", days: 182 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "5y", label: "5Y", days: 1826 },
  { key: "all", label: "All", days: null },
] as const;

export type Range = (typeof RANGES)[number];

export function readRange(raw: unknown): Range {
  return RANGES.find((r) => r.key === raw) ?? RANGES[RANGES.length - 1];
}

/** 6M / 1Y / 5Y / All (long-term holding) as the app's segmented switch (like Beer → Pubs' sort). */
export function RangeSwitch({ base, current }: { base: string; current: Range }) {
  return (
    <div className="flex gap-1 rounded-full bg-surface-muted p-1" role="group" aria-label="Range">
      {RANGES.map((r) => (
        <Link
          key={r.key}
          href={r.key === "all" ? base : `${base}?range=${r.key}`}
          aria-current={r.key === current.key ? "true" : undefined}
          className={`btn flex min-h-11 flex-1 px-2 text-sm ${r.key === current.key ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"}`}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
