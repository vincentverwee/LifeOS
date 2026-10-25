import Link from "next/link";
import type { Pace, PeriodStats, UpcomingExam } from "@/lib/lessons/stats";
import { formatDate, formatHours } from "@/lib/format";

/** Seven small bars, Monday to Sunday, scaled to the daily goal. */
export function WeekBars({ week, goal, todayKey }: { week: PeriodStats["week"]; goal: number; todayKey: string }) {
  const top = Math.max(goal, ...week.map((d) => d.hours));
  return (
    <div className="flex items-end gap-1.5" aria-label="Hours per day this week">
      {week.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <div className="relative flex h-14 w-full items-end overflow-hidden rounded-md bg-surface-muted">
            <div
              className={`w-full rounded-md ${d.hours >= goal ? "bg-good" : "bg-accent"}`}
              style={{ height: `${(d.hours / top) * 100}%` }}
            />
          </div>
          <span className={`text-[11px] ${d.date === todayKey ? "font-semibold text-foreground" : "text-ink-muted"}`}>
            {d.label.slice(0, 2)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function StudyHero({
  stats,
  goal,
  status,
  todayKey,
}: {
  stats: PeriodStats;
  goal: number;
  status: string;
  todayKey: string;
}) {
  const today = stats.todayHours ?? 0;
  const inBlok = stats.phase.kind === "blok";
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm font-medium text-ink-muted">{status}</p>
      <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-foreground">
        {formatHours(today)} <span className="text-lg font-normal text-ink-muted">today</span>
      </p>
      {inBlok && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-surface-muted">
            <div
              className={`h-full rounded-full ${today >= goal ? "bg-good" : "bg-accent"}`}
              style={{ width: `${Math.min(1, today / goal) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            {today >= goal
              ? "Daily goal reached"
              : `${formatHours(Math.round((goal - today) * 100) / 100)} to the ${formatHours(goal)} goal`}
          </p>
        </div>
      )}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="text-ink-muted">This week</span>
          <span className="font-mono tabular-nums text-foreground">{formatHours(stats.weekHours)}</span>
        </div>
        <WeekBars week={stats.week} goal={goal} todayKey={todayKey} />
      </div>
    </section>
  );
}

export function UpcomingExams({ exams }: { exams: UpcomingExam[] }) {
  if (exams.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-medium text-foreground">Coming up</h2>
      <ul className="mt-2 flex flex-col divide-y divide-border">
        {exams.slice(0, 4).map(({ exam, course, daysUntil }) => (
          <li key={exam.id} className="flex items-center justify-between gap-3 py-2.5 last:pb-0">
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: `var(--color-tag-${course?.color ?? "blue"})`,
                }}
                aria-hidden="true"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-foreground">
                  {course?.code ?? "?"} {exam.kind}
                </span>
                <span className="text-xs text-ink-muted">{formatDate(exam.date)}</span>
              </span>
            </span>
            <span
              className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${daysUntil <= 3 ? "text-critical" : "text-foreground"}`}
            >
              {daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Hours so far against earlier periods with as many days left until their last exam. */
export function StudyPace({ pace, insightsHref }: { pace: Pace; insightsHref: string }) {
  const rows = [
    ...(pace.loggedCount > 1 ? [{ id: "avg", name: "the average", theirs: pace.avg.theirs, filled: false }] : []),
    ...pace.peers,
  ];
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-medium text-foreground">
          {pace.daysToEnd} days <span className="font-normal text-ink-muted">before the last exam</span>
        </h2>
        <span className="font-mono text-sm tabular-nums text-ink-muted">{formatHours(pace.mine)} so far</span>
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-border">
        {rows.map((row) => {
          const delta = Math.round((pace.mine - row.theirs) * 100) / 100;
          const ahead = delta >= 0;
          return (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="flex min-w-0 flex-col">
                <span className="text-sm text-foreground">vs {row.name}</span>
                <span className="text-xs text-ink-muted">
                  {row.filled ? "not logging yet here — filled in" : `${formatHours(row.theirs)} at this point`}
                </span>
              </span>
              {!row.filled && (
                <span
                  className={`shrink-0 text-right font-mono text-base font-semibold tabular-nums ${
                    ahead ? "text-positive-text" : "text-critical"
                  }`}
                >
                  <span aria-hidden="true">{ahead ? "▲ " : "▼ "}</span>
                  {formatHours(Math.abs(delta))}
                  <span className="block font-sans text-xs font-normal">{ahead ? "ahead" : "behind"}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <Link href={insightsHref} className="btn btn-ghost -mx-3 mt-2 inline-flex min-h-11 px-3 text-sm">
        See insights ›
      </Link>
    </section>
  );
}
