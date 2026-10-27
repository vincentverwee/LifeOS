import Link from "next/link";
import { getRoutineLogs } from "@/lib/data/routines";
import { getTodayKey } from "@/lib/today";
import { formatPercent } from "@/lib/format";
import { formatDay } from "@/lib/reminders/schedule";
import { isOverdue } from "@/lib/reminders/routines";
import {
  CALENDAR_WEEKS,
  calendarWeeks,
  countMonthToDate,
  routineStats,
  sameDayLastMonth,
  weekdayCounts,
  type CalendarDay,
} from "@/lib/reminders/insights";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { Disclosure } from "@/components/Disclosure";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Calendar shades (0 = nothing); mixed into the muted surface so it works in both themes. */
const HEAT = [
  "var(--color-surface-muted)",
  "color-mix(in oklab, var(--color-tag-green) 40%, var(--color-surface-muted))",
  "color-mix(in oklab, var(--color-tag-green) 70%, var(--color-surface-muted))",
  "var(--color-tag-green)",
];

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-medium text-foreground">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const times = (n: number) => `${n} ${n === 1 ? "time" : "times"}`;

/** Last done over the past year: how often, how regular, on which days. `?item=` narrows the calendar. */
export default async function RemindersInsightsPage({ searchParams }: PageProps<"/reminders/insights">) {
  const { item: requested } = await searchParams;
  const todayKey = await getTodayKey();
  const routines = await getRoutineLogs(todayKey);

  if (routines.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
        <p className="text-sm text-ink-muted">
          Nothing to show yet: insights come from your Last done items.{" "}
          <Link href="/reminders/add?type=last-done" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
            Add one
          </Link>
        </p>
      </div>
    );
  }

  const selected = routines.find((r) => r.id === requested) ?? null;
  const shownLogs = selected ? selected.doneOns : routines.flatMap((r) => r.doneOns);
  const allLogs = routines.flatMap((r) => r.doneOns);

  const thisMonth = countMonthToDate(allLogs, todayKey);
  const lastMonth = countMonthToDate(allLogs, sameDayLastMonth(todayKey));
  const stats = routines.map((routine) => ({ routine, stats: routineStats(routine, todayKey) }));
  // On time across every nudged item, weighted by how many gaps each has.
  const nudged = stats.filter((s) => s.stats.onTime !== null);
  const gapCount = nudged.reduce((sum, s) => sum + s.stats.count - 1, 0);
  const onTime = gapCount ? nudged.reduce((sum, s) => sum + s.stats.onTime! * (s.stats.count - 1), 0) / gapCount : null;
  const overdue = routines.filter((r) => isOverdue({ everyDays: r.everyDays, lastDoneOn: r.doneOns.at(-1) ?? null }, todayKey)).length;

  const weeks = calendarWeeks(shownLogs, todayKey);
  const inCalendar = weeks.flat().reduce((sum, day) => sum + day.count, 0);
  const weekdays = weekdayCounts(shownLogs);
  const maxWeekday = Math.max(...weekdays);
  const maxCount = Math.max(...stats.map((s) => s.stats.count));
  const byCount = [...stats].sort((a, b) => b.stats.last30 - a.stats.last30 || b.stats.count - a.stats.count);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-foreground">Insights</h1>

      <SummaryCards
        cards={[
          {
            label: "This month",
            value: String(thisMonth),
            hint: thisMonth === lastMonth ? "same as last month" : `${Math.abs(thisMonth - lastMonth)} ${thisMonth > lastMonth ? "more" : "fewer"} than last month`,
            tone: thisMonth === lastMonth ? "neutral" : thisMonth > lastMonth ? "positive" : "negative",
          },
          {
            label: "On time",
            value: onTime === null ? "–" : formatPercent(onTime * 100),
            hint: onTime === null ? "set an every N days" : "within every N days",
            icon: null,
          },
          {
            label: "Overdue",
            value: String(overdue),
            hint: overdue === 0 ? "all caught up" : "past their days",
            tone: overdue === 0 ? "neutral" : "negative",
            icon: null,
          },
        ]}
      />

      <Section title="Calendar" hint={`${times(inCalendar)} in the last ${CALENDAR_WEEKS} weeks · ~${(inCalendar / CALENDAR_WEEKS).toFixed(1)} a week`}>
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <ItemChip href="/reminders/insights" active={!selected} label="All" />
          {routines.map((r) => (
            <ItemChip key={r.id} href={`/reminders/insights?item=${encodeURIComponent(r.id)}`} active={selected?.id === r.id} label={r.name} />
          ))}
        </div>
        <Calendar weeks={weeks} />
      </Section>

      <Section title="Per item" hint="The past year.">
        <ul className="flex flex-col gap-4">
          {byCount.map(({ routine, stats: s }) => {
            const details = [
              s.typicalGap !== null && `usually every ${s.typicalGap} d`,
              s.longestGap !== null && `longest gap ${s.longestGap} d`,
              s.onTime !== null && `${formatPercent(s.onTime * 100)} on time`,
            ].filter(Boolean);
            return (
              <li key={routine.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={`/reminders/last-done/${routine.id}`} className="min-w-0 truncate text-foreground hover:underline">
                    {routine.name}
                  </Link>
                  <span className="shrink-0 text-ink-muted">
                    <span className="font-mono font-semibold tabular-nums text-foreground">{s.last30}×</span> in 30 days
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-tag-green"
                    style={{ width: `${maxCount ? (s.count / maxCount) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {s.count === 0 ? "Not logged this year" : `${times(s.count)} this year`}
                  {details.length > 0 && ` · ${details.join(" · ")}`}
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      {shownLogs.length > 0 && (
        <Disclosure title={selected ? `By weekday · ${selected.name}` : "By weekday"}>
          <ul className="flex flex-col gap-2">
            {weekdays.map((count, i) => (
              <li key={WEEKDAY_LABELS[i]} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 text-sm">
                <span className="text-ink-muted">{WEEKDAY_LABELS[i]}</span>
                <span className="h-2 rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full bg-tag-green"
                    style={{ width: `${maxWeekday ? (count / maxWeekday) * 100 : 0}%` }}
                  />
                </span>
                <span className="text-right font-mono tabular-nums text-foreground">{count}</span>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </div>
  );
}

function ItemChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`btn inline-flex min-h-11 shrink-0 px-4 text-sm whitespace-nowrap ${active ? "btn-primary" : "btn-outline"}`}
    >
      {label}
    </Link>
  );
}

/** Weeks as columns (Monday on top), like a contribution graph; deeper green = more logged that day. */
function Calendar({ weeks }: { weeks: CalendarDay[][] }) {
  const columns = { gridTemplateColumns: `1.75rem repeat(${weeks.length}, minmax(0, 1fr))` };
  return (
    <div className="flex flex-col gap-1" role="img" aria-label="Days with something logged">
      <div className="grid gap-[3px] text-[10px] text-ink-muted" style={columns} aria-hidden="true">
        <span />
        {weeks.map((week) => (
          // Label the first week of each month.
          <span key={week[0].key} className="overflow-visible whitespace-nowrap">
            {Number(week[0].key.slice(8)) <= 7 ? monthFormatter.format(new Date(`${week[0].key}T00:00:00Z`)) : ""}
          </span>
        ))}
      </div>
      {WEEKDAY_LABELS.map((label, d) => (
        <div key={label} className="grid gap-[3px]" style={columns}>
          <span className="text-[10px] leading-none text-ink-muted self-center" aria-hidden="true">
            {d % 2 === 0 ? label : ""}
          </span>
          {weeks.map((week) => {
            const day = week[d];
            return (
              <span
                key={day.key}
                title={day.future ? undefined : `${formatDay(day.key)} · ${times(day.count)}`}
                className={`aspect-square rounded-[3px] ${day.future ? "opacity-0" : ""}`}
                style={{ backgroundColor: HEAT[Math.min(day.count, HEAT.length - 1)] }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
