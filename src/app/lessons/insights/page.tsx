import Link from "next/link";
import { loadStudyPeriods } from "@/lib/data/lessons";
import { getTodayKey } from "@/lib/today";
import { comparePace, computePeriodStats, countdownChart } from "@/lib/lessons/stats";
import { CATEGORY_COLOR_SLOTS } from "@/lib/categoryPalette";
import { formatDate, formatHours, formatPercent } from "@/lib/format";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { Disclosure } from "@/components/Disclosure";
import type { ChartSeries } from "@/components/lessons/StudyCharts";
import { CountdownChart, StudyWeekdayChart, WeeklyChart } from "@/components/lessons/StudyChartsLazy";
import { StudyPeriodSwitcher } from "@/components/lessons/StudyPeriodSwitcher";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-medium text-foreground">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const hoursOrDash = (n: number | null) => (n === null ? "–" : formatHours(n));

export default async function LessonsInsightsPage({ searchParams }: PageProps<"/lessons/insights">) {
  const { period: requested } = await searchParams;
  const todayKey = await getTodayKey();
  const { periods, period } = await loadStudyPeriods(typeof requested === "string" ? requested : undefined, todayKey, { peerEntries: true });

  if (!period) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
        <p className="text-sm text-ink-muted">No study period yet.</p>
      </div>
    );
  }

  const stats = computePeriodStats(period, todayKey);
  const pace = comparePace(period, periods, todayKey);
  const chart = countdownChart(period, periods, todayKey);
  // A period keeps its colour everywhere: slots in chronological order.
  const chronological = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const colorOf = (id: string) =>
    CATEGORY_COLOR_SLOTS[chronological.findIndex((p) => p.id === id) % CATEGORY_COLOR_SLOTS.length];
  const series: ChartSeries[] = chart.series.map((s) => ({ ...s, color: colorOf(s.key) }));
  const finished = period.endDate < todayKey;
  const maxCourse = Math.max(0, ...stats.courses.map((c) => c.hours));
  const summaries = chronological
    .map((p) => ({ period: p, stats: p.id === period.id ? stats : computePeriodStats(p, todayKey) }))
    .reverse();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
        <StudyPeriodSwitcher periods={periods} activeId={period.id} />
      </div>

      <SummaryCards
        cards={[
          {
            label: "Total",
            value: formatHours(stats.total),
            hint:
              pace && pace.loggedCount > 0
                ? `${pace.mine >= pace.avg.theirs ? "+" : "−"}${formatHours(Math.abs(Math.round((pace.mine - pace.avg.theirs) * 100) / 100))} vs earlier`
                : undefined,
            tone: pace && pace.loggedCount > 0 ? (pace.mine >= pace.avg.theirs ? "positive" : "negative") : "neutral",
          },
          {
            label: "Per study day",
            value: hoursOrDash(stats.avgPerStudyDay),
            hint: `${stats.studiedDays} ${stats.studiedDays === 1 ? "day" : "days"} studied`,
            icon: null,
          },
          {
            label: `Days ≥ ${formatHours(period.goalHours)}`,
            value: String(stats.daysAtGoal),
            hint: stats.elapsedDays ? `${formatPercent((stats.daysAtGoal / stats.elapsedDays) * 100)} of days` : undefined,
            icon: null,
          },
        ]}
      />

      {pace && !finished && (
        <Section title="Where this is heading">
          <p className="text-sm text-foreground">
            At the pace of earlier periods you&apos;d end around{" "}
            <strong className="font-mono tabular-nums">{formatHours(Math.round((pace.mine + pace.avg.remaining) * 100) / 100)}</strong>{" "}
            <span className="text-ink-muted">(they averaged {formatHours(pace.avg.total)})</span>.
          </p>
        </Section>
      )}

      {chart.points.length > 1 && (
        <Section title="Countdown to the last exam">
          <CountdownChart points={chart.points} series={series} hasAvg={chart.hasAvg} />
        </Section>
      )}

      {stats.courses.length > 0 && (
        <Section title="Per course">
          <ul className="flex flex-col gap-3">
            {[...stats.courses]
              .sort((a, b) => b.hours - a.hours)
              .map((c) => (
                <li key={c.course.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-foreground">
                      {c.course.code} <span className="text-ink-muted">{c.course.name !== c.course.code ? c.course.name : ""}</span>
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-foreground">{formatHours(c.hours)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${maxCourse ? (c.hours / maxCourse) * 100 : 0}%`,
                        backgroundColor: `var(--color-tag-${c.course.color})`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {formatPercent(c.share * 100)} · {c.days} {c.days === 1 ? "day" : "days"}
                    {c.lastStudied ? ` · last ${formatDate(c.lastStudied)}` : ""}
                  </p>
                </li>
              ))}
          </ul>
          {stats.unassigned > 0 && (
            <p className="mt-3 text-xs text-ink-muted">{formatHours(stats.unassigned)} logged without a course.</p>
          )}
        </Section>
      )}

      {(stats.weeks.length > 0 || stats.elapsedDays > 0) && (
        <Disclosure title="More details">
          {stats.weeks.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">Per week</h3>
              <WeeklyChart weeks={stats.weeks} />
            </div>
          )}
          {stats.elapsedDays > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground">By weekday</h3>
              <p className="mb-2 text-xs text-ink-muted">Average hours per day, since the first logged day.</p>
              <StudyWeekdayChart weekdays={stats.weekdays} />
            </div>
          )}
        </Disclosure>
      )}

      <Disclosure title="All periods">
        <ul className="flex flex-col divide-y divide-border">
          {summaries.map(({ period: p, stats: s }) => (
            <li key={p.id}>
              <Link
                href={`/lessons/insights?period=${encodeURIComponent(p.id)}`}
                className="tap -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-tag-${colorOf(p.id)})` }} aria-hidden="true" />
                  <span className="flex min-w-0 flex-col">
                    <span className={`truncate text-sm ${p.id === period.id ? "font-semibold" : ""} text-foreground`}>{p.name}</span>
                    <span className="text-xs text-ink-muted">
                      {s.studiedDays} days · {hoursOrDash(s.avgPerStudyDay)}/day · {s.daysAtGoal} ≥ goal
                    </span>
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">{formatHours(s.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}
