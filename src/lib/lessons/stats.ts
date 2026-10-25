import type { StudyCourse, StudyExam, StudyPeriod } from "@/lib/lessons/types";

// Pure study-period math. Everything is computed from the entries; nothing is
// stored per day. Dates are "YYYY-MM-DD" keys (UTC midnight).

const DAY_MS = 86_400_000;

export function addDays(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function mondayOf(key: string): string {
  const weekday = (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
  return addDays(key, -weekday);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Hours per logged day, in date order. */
export function dailyTotals(period: StudyPeriod): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of period.entries) totals.set(e.date, round2((totals.get(e.date) ?? 0) + e.hours));
  return totals;
}

/** Hours logged on or before `date`. */
export function hoursUpTo(period: StudyPeriod, date: string): number {
  return round2(period.entries.reduce((sum, e) => (e.date <= date ? sum + e.hours : sum), 0));
}

function hoursBetween(period: StudyPeriod, from: string, to: string): number {
  return round2(period.entries.reduce((sum, e) => (e.date >= from && e.date <= to ? sum + e.hours : sum), 0));
}

export function firstEntryDate(period: StudyPeriod): string | null {
  return period.entries[0]?.date ?? null;
}

export function isFinished(period: StudyPeriod, todayKey: string): boolean {
  return period.endDate < todayKey;
}

/** The period running today, else the latest one that started. */
export function pickCurrentPeriod<T extends { startDate: string; endDate: string }>(
  periods: T[],
  todayKey: string
): T | null {
  const sorted = [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate));
  return (
    sorted.find((p) => p.startDate <= todayKey && todayKey <= p.endDate) ??
    sorted.find((p) => p.startDate <= todayKey) ??
    sorted[0] ??
    null
  );
}

export type Phase =
  | { kind: "lessons"; daysToBlok: number }
  | { kind: "blok"; day: number; of: number }
  | { kind: "over" };

export function phaseOf(period: StudyPeriod, todayKey: string): Phase {
  if (todayKey > period.endDate) return { kind: "over" };
  if (todayKey < period.blokStart) return { kind: "lessons", daysToBlok: daysBetween(todayKey, period.blokStart) };
  return {
    kind: "blok",
    day: daysBetween(period.blokStart, todayKey) + 1,
    of: daysBetween(period.blokStart, period.endDate) + 1,
  };
}

/** "Blok in 21 days" / "Blok day 5 of 34" / "Period over" */
export function phaseLabel(phase: Phase): string {
  if (phase.kind === "over") return "Period over";
  if (phase.kind === "blok") return `Blok day ${phase.day} of ${phase.of}`;
  if (phase.daysToBlok === 0) return "Blok starts today";
  return `Blok in ${phase.daysToBlok} ${phase.daysToBlok === 1 ? "day" : "days"}`;
}

/** Lesson week (1-based) that contains `date`. */
export function lessonWeekOf(period: StudyPeriod, date: string): number {
  return Math.floor(daysBetween(period.startDate, date) / 7) + 1;
}

/** Weeks shown in the lesson grid: up to the blok, plus any later week with marks. */
export function lessonWeekCount(period: StudyPeriod): number {
  const untilBlok = Math.max(1, Math.ceil(daysBetween(period.startDate, period.blokStart) / 7));
  return Math.max(untilBlok, ...period.marks.map((m) => m.week));
}

export type CourseStat = { course: StudyCourse; hours: number; days: number; lastStudied: string | null; share: number };
export type WeekdayStat = { label: string; total: number; days: number; avg: number };
export type WeekStat = { start: string; hours: number; blok: boolean };
export type UpcomingExam = { exam: StudyExam; course: StudyCourse | undefined; daysUntil: number };

export type PeriodStats = {
  /** the last day that counts: today, or the last exam for a finished period */
  asOf: string;
  phase: Phase;
  /** days from asOf until the last exam */
  daysToEnd: number;
  /** null when today isn't inside the period */
  todayHours: number | null;
  /** Monday–Sunday of asOf's week */
  week: { date: string; label: string; hours: number }[];
  weekHours: number;
  last7: number;
  total: number;
  /** days with more than 0 h */
  studiedDays: number;
  avgPerStudyDay: number | null;
  medianPerStudyDay: number | null;
  max: { hours: number; date: string } | null;
  daysAtGoal: number;
  topDays: number;
  /** days from the first logged day to asOf */
  elapsedDays: number;
  firstDay: string | null;
  courses: CourseStat[];
  /** hours logged without a course */
  unassigned: number;
  weekdays: WeekdayStat[];
  weeks: WeekStat[];
  upcomingExams: UpcomingExam[];
};

export function computePeriodStats(period: StudyPeriod, todayKey: string): PeriodStats {
  const asOf = todayKey < period.endDate ? todayKey : period.endDate;
  const totals = dailyTotals(period);
  const firstDay = firstEntryDate(period);
  const counted = [...totals].filter(([date]) => date <= asOf);
  const studied = counted.map(([, h]) => h).filter((h) => h > 0);
  const total = round2(counted.reduce((sum, [, h]) => sum + h, 0));

  const sorted = [...studied].sort((a, b) => a - b);
  const median =
    sorted.length === 0
      ? null
      : sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]
        : round2((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);
  const maxEntry = counted.reduce<[string, number] | null>((best, cur) => (!best || cur[1] > best[1] ? cur : best), null);

  const monday = mondayOf(asOf);
  const week = WEEKDAY_LABELS.map((label, i) => {
    const date = addDays(monday, i);
    return { date, label, hours: date <= asOf ? (totals.get(date) ?? 0) : 0 };
  });

  const courses = period.courses.map((course) => {
    const own = period.entries.filter((e) => e.courseId === course.id && e.date <= asOf);
    const hours = round2(own.reduce((sum, e) => sum + e.hours, 0));
    const days = new Set(own.filter((e) => e.hours > 0).map((e) => e.date));
    return {
      course,
      hours,
      days: days.size,
      lastStudied: [...days].sort().at(-1) ?? null,
      share: total > 0 ? hours / total : 0,
    };
  });
  const unassigned = round2(total - courses.reduce((sum, c) => sum + c.hours, 0));

  const elapsedDays = firstDay && firstDay <= asOf ? daysBetween(firstDay, asOf) + 1 : 0;
  const weekdays = WEEKDAY_LABELS.map((label) => ({ label, total: 0, days: 0, avg: 0 }));
  for (let i = 0; i < elapsedDays; i++) {
    const date = addDays(firstDay!, i);
    const w = weekdays[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];
    w.days += 1;
    w.total = round2(w.total + (totals.get(date) ?? 0));
  }
  weekdays.forEach((w) => (w.avg = w.days ? round2(w.total / w.days) : 0));

  const weeks: WeekStat[] = [];
  if (firstDay) {
    for (let start = mondayOf(firstDay); start <= asOf; start = addDays(start, 7)) {
      weeks.push({
        start,
        hours: hoursBetween(period, start, addDays(start, 6) < asOf ? addDays(start, 6) : asOf),
        blok: addDays(start, 6) >= period.blokStart,
      });
    }
  }

  const courseById = new Map(period.courses.map((c) => [c.id, c]));
  const upcomingExams = period.exams
    .filter((e) => e.date >= todayKey)
    .map((exam) => ({ exam, course: courseById.get(exam.courseId), daysUntil: daysBetween(todayKey, exam.date) }));

  return {
    asOf,
    phase: phaseOf(period, todayKey),
    daysToEnd: daysBetween(asOf, period.endDate),
    todayHours: todayKey >= period.startDate && todayKey <= period.endDate ? (totals.get(todayKey) ?? 0) : null,
    week,
    weekHours: round2(week.reduce((sum, d) => sum + d.hours, 0)),
    last7: hoursBetween(period, addDays(asOf, -6), asOf),
    total,
    studiedDays: studied.length,
    avgPerStudyDay: studied.length ? round2(total / studied.length) : null,
    medianPerStudyDay: median,
    max: maxEntry && maxEntry[1] > 0 ? { date: maxEntry[0], hours: maxEntry[1] } : null,
    daysAtGoal: studied.filter((h) => h >= period.goalHours).length,
    topDays: studied.filter((h) => h >= period.topDayHours).length,
    elapsedDays,
    firstDay,
    courses,
    unassigned,
    weekdays,
    weeks,
    upcomingExams,
  };
}

// --- Comparison with earlier periods, counting down to the last exam ---
//
// Logging didn't always start at the same point before the exams. To keep the
// periods in sync, the days before a period's first log are filled in with the
// hours of the most recent other period that did log that day (what the old
// "Vergelijking" sheets did by hand). The period being looked at is never
// filled in: it starts at 0 on its first log. Filled-in hours only exist here;
// totals and KPIs elsewhere stay real.

/** x = days before the last exam, negated: 0 is the last exam, -7 a week before. */
function xOf(period: StudyPeriod, date: string): number {
  return -daysBetween(date, period.endDate);
}

type Coverage = { period: StudyPeriod; first: number; last: number; daily: Map<number, number> };

function coverage(period: StudyPeriod, asOf: string): Coverage {
  const daily = new Map<number, number>();
  for (const [date, hours] of dailyTotals(period)) daily.set(xOf(period, date), hours);
  return { period, first: xOf(period, firstEntryDate(period)!), last: xOf(period, asOf), daily };
}

export type SyncedCurve = {
  period: StudyPeriod;
  /** cumulative hours by x, from the common start to the period's last known day */
  cumulative: Map<number, number>;
  /** first x that is really logged; everything before it is filled in */
  first: number;
  last: number;
};

/** Every period with entries, in sync from the earliest common start. */
function syncedCurves(periods: StudyPeriod[], active: StudyPeriod, todayKey: string): { curves: SyncedCurve[]; lead: number } {
  const asOfOf = (p: StudyPeriod) => (p.id === active.id && todayKey < p.endDate ? todayKey : p.endDate);
  const covered = periods.filter((p) => p.entries.length > 0).map((p) => coverage(p, asOfOf(p)));
  const lead = Math.max(0, ...covered.map((c) => -c.first));
  const mostRecentFirst = [...covered].sort((a, b) => b.period.startDate.localeCompare(a.period.startDate));

  const curves = covered.map((c) => {
    const cumulative = new Map<number, number>();
    let sum = 0;
    // The period being looked at starts at 0 on its own first log; only the
    // earlier ones are filled in.
    const from = c.period.id === active.id ? c.first : -lead;
    for (let x = from; x <= c.last; x++) {
      let hours = 0;
      if (x >= c.first) {
        hours = c.daily.get(x) ?? 0;
      } else {
        const source = mostRecentFirst.find((s) => s !== c && x >= s.first && x <= s.last);
        hours = source?.daily.get(x) ?? 0;
      }
      sum = round2(sum + hours);
      cumulative.set(x, sum);
    }
    return {
      period: c.period,
      cumulative,
      first: c.first,
      last: c.last,
    };
  });
  return { curves, lead };
}

const at = (curve: SyncedCurve, x: number) => curve.cumulative.get(Math.min(x, curve.last)) ?? 0;

export type PeerPace = {
  id: string;
  name: string;
  /** their (synced) hours with as many days left until their last exam */
  theirs: number;
  /** their hours in the 7 days up to that point */
  last7: number;
  /** their real whole-period total */
  total: number;
  /** true when they hadn't started logging yet here, so `theirs` is all filled in */
  filled: boolean;
};

export type Pace = {
  daysToEnd: number;
  /** hours logged so far (the viewed period is never filled in) */
  mine: number;
  mineLast7: number;
  peers: PeerPace[];
  /** peers that had really logged by this point; `avg.theirs`/`last7` cover only them */
  loggedCount: number;
  avg: { theirs: number; last7: number; total: number; remaining: number };
};

/** Earlier, finished periods with logged hours. */
export function peerPeriods(active: StudyPeriod, all: StudyPeriod[], todayKey: string): StudyPeriod[] {
  return all.filter((p) => p.id !== active.id && isFinished(p, todayKey) && p.entries.length > 0);
}

export function comparePace(active: StudyPeriod, all: StudyPeriod[], todayKey: string): Pace | null {
  const peers = peerPeriods(active, all, todayKey);
  if (peers.length === 0 || active.entries.length === 0) return null;
  const asOf = todayKey < active.endDate ? todayKey : active.endDate;
  const x = xOf(active, asOf);
  const { curves } = syncedCurves([active, ...peers], active, todayKey);
  const mine = curves.find((c) => c.period.id === active.id)!;
  const window = (curve: SyncedCurve) => round2(at(curve, x) - at(curve, x - 7));

  const rows = curves
    .filter((c) => c !== mine)
    .map((c) => ({
      id: c.period.id,
      name: c.period.name,
      theirs: at(c, x),
      last7: window(c),
      total: hoursUpTo(c.period, c.period.endDate),
      remaining: round2(at(c, 0) - at(c, x)),
      filled: x < c.first,
    }));
  // A period that is all filled in at this point only echoes the others.
  const logged = rows.filter((r) => !r.filled);
  const basis = logged.length ? logged : rows;
  const mean = (values: number[]) => round2(values.reduce((a, b) => a + b, 0) / values.length);

  return {
    daysToEnd: -x,
    mine: at(mine, x),
    mineLast7: window(mine),
    peers: rows.map((r) => ({ id: r.id, name: r.name, theirs: r.theirs, last7: r.last7, total: r.total, filled: r.filled })),
    loggedCount: logged.length,
    avg: {
      theirs: mean(basis.map((r) => r.theirs)),
      last7: mean(basis.map((r) => r.last7)),
      total: mean(rows.map((r) => r.total)),
      remaining: mean(rows.map((r) => r.remaining)),
    },
  };
}

export type CountdownPoint = { x: number } & Record<string, number | null>;
/** `key` holds the logged part of the line, `filledKey` the filled-in part. */
export type CountdownSeries = { key: string; filledKey: string; name: string; active: boolean };

/**
 * Synced cumulative hours of every period by days before its last exam (x = 0
 * is the last exam). The active one stops at today. "avg" averages the earlier
 * periods.
 */
export function countdownChart(
  active: StudyPeriod,
  all: StudyPeriod[],
  todayKey: string
): { points: CountdownPoint[]; series: CountdownSeries[]; hasAvg: boolean } {
  const peers = peerPeriods(active, all, todayKey);
  const { curves, lead } = syncedCurves([active, ...peers], active, todayKey);
  const filledKey = (id: string) => `${id}~filled`;

  const points: CountdownPoint[] = [];
  for (let x = -lead; x <= 0; x++) {
    const point: CountdownPoint = { x };
    for (const c of curves) {
      const known = x <= c.last;
      point[c.period.id] = known && x >= c.first && c.cumulative.has(x) ? at(c, x) : null;
      // the filled part runs up to the first logged day so both parts connect
      point[filledKey(c.period.id)] = known && x <= c.first && c.cumulative.has(x) ? at(c, x) : null;
    }
    const peerValues = curves.filter((c) => c.period.id !== active.id).map((c) => at(c, x));
    point.avg = peerValues.length ? round2(peerValues.reduce((a, b) => a + b, 0) / peerValues.length) : null;
    points.push(point);
  }

  return {
    points,
    series: curves.map((c) => ({
      key: c.period.id,
      filledKey: filledKey(c.period.id),
      name: c.period.name,
      active: c.period.id === active.id,
    })),
    hasAvg: peers.length > 1,
  };
}
