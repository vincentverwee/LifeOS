import Link from "next/link";
import { getStudyTimer, getTrackedEntries, loadStudyPeriods } from "@/lib/data/lessons";
import { RunningTimerBadge } from "@/components/lessons/RunningTimerBadge";
import { getTodayKey } from "@/lib/today";
import { comparePace, computePeriodStats, lessonWeekCount, lessonWeekOf, phaseLabel } from "@/lib/lessons/stats";
import { StudyHero, StudyPace, UpcomingExams } from "@/components/lessons/TodayCards";
import { StudyEntryList } from "@/components/lessons/StudyEntryList";
import { WeekLessons } from "@/components/lessons/LessonGrid";
import { StudyPeriodSwitcher } from "@/components/lessons/StudyPeriodSwitcher";
import { formatHours } from "@/lib/format";
import { formatMinutes, trackedTotals, weekStart } from "@/lib/lessons/tracked";

export default async function LessonsTodayPage({ searchParams }: PageProps<"/lessons">) {
  const { period: requested } = await searchParams;
  const todayKey = await getTodayKey();
  const [{ periods, period }, timer, trackedThisWeek] = await Promise.all([
    loadStudyPeriods(typeof requested === "string" ? requested : undefined, todayKey, { peerEntries: true }),
    getStudyTimer(),
    // Across semesters, so the card is right whichever period is shown.
    getTrackedEntries(weekStart(todayKey)),
  ]);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${todayKey}T00:00:00Z`));

  if (!period) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Today</h1>
        <p className="text-sm text-ink-muted">
          No study period yet.{" "}
          <Link href="/lessons/settings" className="text-primary">
            Create one in Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  const stats = computePeriodStats(period, todayKey);
  const pace = comparePace(period, periods, todayKey);
  const week = lessonWeekOf(period, todayKey);
  const showWeekLessons = week >= 1 && week <= lessonWeekCount(period) && period.courses.length > 0;
  const todaysEntries = period.entries.filter((e) => e.date === todayKey);
  const query = `?period=${encodeURIComponent(period.id)}`;
  // Tracked time (Ekonomika, Projectvak…): only a link here, never in the study numbers above.
  const trackedWeek = trackedTotals(
    trackedThisWeek.map((e) => ({ date: e.date, minutes: Math.round(e.hours * 60), key: e.courseName })),
    todayKey
  ).week;
  const trackedNames = [
    ...new Set([...period.trackedCourses.map((c) => c.name), ...trackedThisWeek.map((e) => e.courseName)]),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Today</h1>
          <p className="mt-1 text-sm text-ink-muted">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <StudyPeriodSwitcher periods={periods} activeId={period.id} />
          <Link href={`/lessons/add${query}`} className="btn btn-primary hidden px-4 py-2.5 text-sm font-semibold sm:inline-flex">
            + Log time
          </Link>
        </div>
      </div>

      {timer && <RunningTimerBadge timer={timer} card />}

      <StudyHero stats={stats} goal={period.goalHours} status={phaseLabel(stats.phase)} todayKey={todayKey} />

      <UpcomingExams exams={stats.upcomingExams} />

      {pace && stats.phase.kind !== "over" && <StudyPace pace={pace} insightsHref={`/lessons/insights${query}`} />}

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex items-baseline justify-between gap-2 px-4 pt-4 pb-2">
          <h2 className="font-medium text-foreground">Studied today</h2>
          <span className="font-mono text-sm tabular-nums text-ink-muted">{formatHours(stats.todayHours ?? 0)}</span>
        </div>
        <StudyEntryList entries={todaysEntries} courses={period.courses} empty="Nothing logged today yet." />
        <Link href={`/lessons/log${query}`} className="btn btn-ghost mx-1 mb-2 inline-flex min-h-11 px-3 text-sm">
          Full log ›
        </Link>
      </section>

      {trackedNames.length > 0 && (
        <Link
          href="/lessons/tracked"
          className="tap flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
        >
          <span className="min-w-0">
            <span className="block font-medium text-foreground">Tracked time</span>
            <span className="block truncate text-sm text-ink-muted">{trackedNames.join(", ")}</span>
          </span>
          <span className="shrink-0 text-sm text-ink-muted">
            <span className="font-mono tabular-nums text-foreground">{formatMinutes(trackedWeek)}</span> this week ›
          </span>
        </Link>
      )}

      {showWeekLessons && (
        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-1">
            <h2 className="font-medium text-foreground">Lessons · week {week}</h2>
            <Link href={`/lessons/grid${query}`} className="btn btn-ghost -mr-3 inline-flex min-h-11 px-3 text-sm">
              All weeks ›
            </Link>
          </div>
          <WeekLessons key={`${period.id}:${week}`} courses={period.courses} marks={period.marks} week={week} />
        </section>
      )}
    </div>
  );
}
