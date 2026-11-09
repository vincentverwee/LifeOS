import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStudyDays, getTrackedCourses, getTrackedEntries } from "@/lib/data/lessons";
import { getTodayKey } from "@/lib/today";
import { addDays } from "@/lib/reminders/schedule";
import {
  academicYearStart,
  formatMinutes,
  trackedByKey,
  trackedTotals,
  trackedWeeks,
  weekStart,
} from "@/lib/lessons/tracked";
import { StudyEntryList } from "@/components/lessons/StudyEntryList";
import { Disclosure } from "@/components/Disclosure";

const WEEKS = 12;
const LATEST = 10;
/** The weekly bars' study segment; not a course name, so it can't clash with one. */
const SCHOOL = "\u0000school";
const SCHOOL_COLOR = "var(--color-primary)";
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Tracked time: courses with "Counts as study" off (Ekonomika, Projectvak…), across every
 * semester, grouped by course name. None of it appears in the study pages.
 */
export default async function TrackedTimePage() {
  const todayKey = await getTodayKey();
  const yearStart = academicYearStart(todayKey);
  const since = [yearStart, addDays(weekStart(todayKey), -7 * (WEEKS - 1))].sort()[0];
  const [entries, courses, studyDays] = await Promise.all([
    getTrackedEntries(since),
    getTrackedCourses(),
    getStudyDays(since),
  ]);

  const lite = entries.map((e) => ({ date: e.date, minutes: Math.round(e.hours * 60), key: e.courseName }));
  const totals = trackedTotals(lite, todayKey);
  // The weekly bars also show school (everything that counts as study), to compare with.
  const school = studyDays.map((d) => ({ date: d.date, minutes: Math.round(d.hours * 60), key: SCHOOL }));
  const weeks = trackedWeeks([...school, ...lite], todayKey, WEEKS);
  const byName = trackedByKey(lite, yearStart, todayKey);
  // One colour per activity: its newest course's.
  const colorOf = new Map<string, string>();
  for (const e of entries) if (!colorOf.has(e.courseName)) colorOf.set(e.courseName, e.color);
  const names = [...new Set([...byName.map((b) => b.key), ...entries.map((e) => e.courseName)])];
  const colorFor = (key: string) => (key === SCHOOL ? SCHOOL_COLOR : `var(--color-tag-${colorOf.get(key) ?? "blue"})`);
  const labelFor = (key: string) => (key === SCHOOL ? "School" : key);
  // Legend: each series' total over the shown weeks, school first.
  const weekKeys = [SCHOOL, ...names]
    .map((key) => ({ key, minutes: weeks.reduce((total, w) => total + (w.byKey[key] ?? 0), 0) }))
    .filter((k) => k.minutes > 0);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.total));
  const maxName = Math.max(1, ...byName.map((b) => b.minutes));
  const listEntries = entries.map(({ id, date, hours, courseId, note, periodId }) => ({ id, date, hours, courseId, note, periodId }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tracked time"
        subtitle="Courses with “Counts as study” off. Log them with Log time; they stay out of your study numbers. The weekly bars show school next to them."
        back={{ href: "/lessons", label: "Lessons" }}
      />

      {courses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
          Nothing tracked yet. In{" "}
          <Link href="/lessons/settings" className="text-primary">
            Settings
          </Link>
          , add a course like Ekonomika or Projectvak and switch off “Counts as study”.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: "This week", minutes: totals.week },
              { label: "This month", minutes: totals.month },
              { label: "Since 1 Sep", minutes: totals.year },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
                <p className="text-xs text-ink-muted">{k.label}</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground sm:text-2xl">
                  {formatMinutes(k.minutes)}
                </p>
              </div>
            ))}
          </div>

          {byName.length > 0 && (
            <section className="flex flex-col gap-3 card">
              <h2 className="font-semibold text-foreground">Since 1 Sep</h2>
              <ul className="flex flex-col gap-3">
                {byName.map((b) => (
                  <li key={b.key} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-tag-${colorOf.get(b.key) ?? "blue"})` }} aria-hidden="true" />
                        <span className="truncate">{b.key}</span>
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-foreground">{formatMinutes(b.minutes)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(b.minutes / maxName) * 100}%`, backgroundColor: `var(--color-tag-${colorOf.get(b.key) ?? "blue"})` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3 card">
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold text-foreground">Last {WEEKS} weeks</h2>
              {weekKeys.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  {weekKeys.map((k) => (
                    <li key={k.key} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorFor(k.key) }} aria-hidden="true" />
                      <span>{labelFor(k.key)}</span>
                      <span className="font-mono tabular-nums text-foreground">{formatMinutes(k.minutes)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ul className="flex flex-col gap-2">
              {[...weeks].reverse().map((w) => (
                <li key={w.start} className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                  <span className="text-ink-muted tabular-nums">{shortDate.format(new Date(`${w.start}T00:00:00Z`))}</span>
                  <div
                    className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
                    role="img"
                    aria-label={`Week of ${w.start}: ${
                      weekKeys.filter((k) => w.byKey[k.key]).map((k) => `${labelFor(k.key)} ${formatMinutes(w.byKey[k.key])}`).join(", ") || "nothing"
                    }`}
                  >
                    {[SCHOOL, ...names].map((name) =>
                      w.byKey[name] ? (
                        <div
                          key={name}
                          className="h-full"
                          style={{ width: `${(w.byKey[name] / maxWeek) * 100}%`, backgroundColor: colorFor(name) }}
                        />
                      ) : null
                    )}
                  </div>
                  <span className="text-right font-mono tabular-nums text-foreground">{w.total ? formatMinutes(w.total) : "—"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="section-title">Latest</h2>
            <StudyEntryList entries={listEntries.slice(0, LATEST)} courses={courses} tracked empty="Nothing logged yet." />
            {listEntries.length > LATEST && (
              <Disclosure title={`All ${listEntries.length} since ${shortDate.format(new Date(`${since}T00:00:00Z`))}`}>
                <StudyEntryList entries={listEntries.slice(LATEST)} courses={courses} tracked groupByDay />
              </Disclosure>
            )}
          </section>
        </>
      )}

      <Link href="/lessons/add" className="btn btn-primary flex min-h-11 w-full px-4 text-base font-semibold sm:w-auto sm:self-start">
        + Log time
      </Link>
    </div>
  );
}
