import type { ListExpense } from "@/lib/data/expenses";
import { formatCurrency } from "@/lib/format";
import { Disclosure } from "@/components/Disclosure";

const MS_PER_DAY = 86_400_000;
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const labelFormatter = new Intl.DateTimeFormat("nl-BE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Background per heat level (0 = nothing spent); mixed into the muted surface so it works in both themes. */
const HEAT = [
  "var(--color-surface-muted)",
  "color-mix(in oklab, var(--color-tag-orange) 22%, var(--color-surface-muted))",
  "color-mix(in oklab, var(--color-tag-orange) 45%, var(--color-surface-muted))",
  "color-mix(in oklab, var(--color-tag-orange) 70%, var(--color-surface-muted))",
  "var(--color-tag-orange)",
];

function toMs(key: string): number {
  return Date.parse(`${key}T00:00:00Z`);
}

/**
 * A month (or trip) as Monday-first weeks, each day shaded by what was spent.
 * The scale tops out at the ~90th percentile of spending days, so one big day
 * doesn't wash out the rest. Tapping a day jumps to it in the list below.
 */
export function SpendingCalendar({
  startDate,
  endDate,
  todayKey,
  expenses,
}: {
  startDate: string;
  endDate: string;
  todayKey: string;
  expenses: ListExpense[];
}) {
  const totals = new Map<string, number>();
  for (const e of expenses) totals.set(e.date, (totals.get(e.date) ?? 0) + e.amount);

  const sorted = [...totals.values()].filter((v) => v > 0).sort((a, b) => a - b);
  const cap = sorted.length ? sorted[Math.floor(0.9 * (sorted.length - 1))] : 0;
  const levelOf = (total: number) =>
    total <= 0 || cap <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((4 * total) / cap)));

  const startMs = toMs(startDate);
  const endMs = toMs(endDate);
  // Monday on or before the start, Sunday on or after the end.
  const gridStart = startMs - ((new Date(startMs).getUTCDay() + 6) % 7) * MS_PER_DAY;
  const gridEnd = endMs + ((7 - new Date(endMs).getUTCDay()) % 7) * MS_PER_DAY;

  const weeks: { key: string; inPeriod: boolean; total: number }[][] = [];
  for (let ms = gridStart; ms <= gridEnd; ms += MS_PER_DAY) {
    if (weeks.length === 0 || weeks.at(-1)!.length === 7) weeks.push([]);
    const key = new Date(ms).toISOString().slice(0, 10);
    weeks.at(-1)!.push({ key, inPeriod: ms >= startMs && ms <= endMs, total: totals.get(key) ?? 0 });
  }

  return (
    <Disclosure title="Calendar">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted" aria-hidden="true">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].key} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              if (!day.inPeriod) return <span key={day.key} aria-hidden="true" />;
              const level = levelOf(day.total);
              const style = { backgroundColor: HEAT[level] };
              const cell = `flex aspect-square min-h-11 flex-col items-center justify-center rounded-lg leading-none ${
                day.key === todayKey ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : ""
              } ${day.key > todayKey ? "opacity-50" : ""} ${level === 4 ? "text-white" : "text-foreground"}`;
              const content = (
                <>
                  <span className="text-xs">{Number(day.key.slice(8))}</span>
                  {day.total > 0 && (
                    <span className="mt-1 font-mono text-[10px] font-semibold tabular-nums">
                      {Math.round(day.total)}
                    </span>
                  )}
                </>
              );
              const label = labelFormatter.format(new Date(toMs(day.key)));
              return day.total > 0 ? (
                <a
                  key={day.key}
                  href={`#day-${day.key}`}
                  aria-label={`${label} · ${formatCurrency(day.total)}`}
                  className={`tap ${cell}`}
                  style={style}
                >
                  {content}
                </a>
              ) : (
                <span key={day.key} aria-label={`${label} · nothing`} className={cell} style={style}>
                  {content}
                </span>
              );
            })}
          </div>
        ))}
        <div className="flex items-center justify-end gap-1 text-xs text-ink-muted" aria-hidden="true">
          less
          {HEAT.map((bg, i) => (
            <span key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: bg }} />
          ))}
          more
        </div>
      </div>
    </Disclosure>
  );
}
