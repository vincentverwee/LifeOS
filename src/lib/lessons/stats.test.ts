import { describe, expect, it } from "vitest";
import {
  addDays,
  comparePace,
  computePeriodStats,
  countdownChart,
  dailyTotals,
  daysBetween,
  firstEntryDate,
  isFinished,
  lessonWeekCount,
  lessonWeekOf,
  mondayOf,
  peerPeriods,
  phaseLabel,
  phaseOf,
  pickCurrentPeriod,
} from "@/lib/lessons/stats";
import type { StudyCourse, StudyEntry, StudyPeriod } from "@/lib/lessons/types";

// Entries are passed sorted by date, as loadStudyPeriods (src/lib/data/lessons.ts)
// always orders them `date asc, createdAt asc`; firstEntryDate relies on that.

let entryId = 0;
function entry(date: string, hours: number, courseId: string | null = null, note: string | null = null): StudyEntry {
  return { id: `e${++entryId}`, date, hours, courseId, note };
}

function course(id: string): StudyCourse {
  return { id, name: id.toUpperCase(), color: "blue", sortOrder: 0, hasWc: false };
}

function period(over: Partial<StudyPeriod> = {}): StudyPeriod {
  return {
    id: "p",
    name: "Period",
    startDate: "2026-01-05", // Monday
    blokStart: "2026-01-26",
    endDate: "2026-01-31",
    goalHours: 4,
    topDayHours: 8,
    courses: [],
    entries: [],
    exams: [],
    marks: [],
    ...over,
  };
}

describe("date helpers", () => {
  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30"); // over the DST switch
  });

  it("daysBetween is signed whole days", () => {
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysBetween("2026-01-31", "2026-01-01")).toBe(-30);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-01-05", "2026-01-05")).toBe(0);
  });

  it("mondayOf returns the Monday of the week (Sunday belongs to the week before)", () => {
    expect(mondayOf("2026-01-05")).toBe("2026-01-05"); // Monday
    expect(mondayOf("2026-01-07")).toBe("2026-01-05");
    expect(mondayOf("2026-01-11")).toBe("2026-01-05"); // Sunday
    expect(mondayOf("2026-01-01")).toBe("2025-12-29");
  });
});

describe("dailyTotals", () => {
  it("sums hours per day, rounded to 2 decimals, in date order", () => {
    const p = period({
      entries: [entry("2026-01-05", 0.1), entry("2026-01-05", 0.2), entry("2026-01-06", 3), entry("2026-01-08", 0, null, "off")],
    });
    expect([...dailyTotals(p)]).toEqual([
      ["2026-01-05", 0.3],
      ["2026-01-06", 3],
      ["2026-01-08", 0],
    ]);
  });

  it("is empty without entries", () => {
    expect(dailyTotals(period()).size).toBe(0);
  });
});

describe("firstEntryDate", () => {
  it("is the first entry's date (input is sorted) or null", () => {
    expect(firstEntryDate(period())).toBeNull();
    expect(firstEntryDate(period({ entries: [entry("2026-01-06", 1), entry("2026-01-09", 2)] }))).toBe("2026-01-06");
  });
});

describe("computePeriodStats", () => {
  it("median of an odd number of studied days", () => {
    const p = period({ entries: [entry("2026-01-05", 1), entry("2026-01-06", 3), entry("2026-01-07", 2)] });
    expect(computePeriodStats(p, "2026-01-10").medianPerStudyDay).toBe(2);
  });

  it("median of an even number of days is the mean of the middle two, rounded to 2 decimals", () => {
    const p = period({ entries: [entry("2026-01-05", 1), entry("2026-01-06", 1.25)] });
    expect(computePeriodStats(p, "2026-01-10").medianPerStudyDay).toBe(1.13);
    const q = period({
      entries: [entry("2026-01-05", 4.5), entry("2026-01-06", 1), entry("2026-01-07", 3), entry("2026-01-08", 2)],
    });
    expect(computePeriodStats(q, "2026-01-10").medianPerStudyDay).toBe(2.5);
  });

  it("median/avg/max are null without studied days", () => {
    const s = computePeriodStats(period(), "2026-01-10");
    expect(s.medianPerStudyDay).toBeNull();
    expect(s.avgPerStudyDay).toBeNull();
    expect(s.max).toBeNull();
    expect(s.firstDay).toBeNull();
    expect(s.elapsedDays).toBe(0);
    expect(s.weeks).toEqual([]);
    expect(s.total).toBe(0);
  });

  it("0 h days (days off) don't count as studied days", () => {
    const p = period({
      entries: [entry("2026-01-05", 2), entry("2026-01-06", 0, null, "sick"), entry("2026-01-07", 4)],
    });
    const s = computePeriodStats(p, "2026-01-10");
    expect(s.studiedDays).toBe(2);
    expect(s.medianPerStudyDay).toBe(3);
    expect(s.avgPerStudyDay).toBe(3);
    expect(s.total).toBe(6);
    expect(s.daysAtGoal).toBe(1); // goal 4
    expect(s.topDays).toBe(0);
    expect(s.max).toEqual({ date: "2026-01-07", hours: 4 });
    expect(s.elapsedDays).toBe(6); // Jan 5 → Jan 10
  });

  it("only counts entries up to today", () => {
    const p = period({ entries: [entry("2026-01-05", 2), entry("2026-01-12", 5)] });
    const s = computePeriodStats(p, "2026-01-08");
    expect(s.total).toBe(2);
    expect(s.todayHours).toBe(0);
    expect(s.week.map((d) => d.hours)).toEqual([2, 0, 0, 0, 0, 0, 0]);
  });

  it("clamps asOf to the last exam for a finished period", () => {
    const p = period({ entries: [entry("2026-01-30", 3), entry("2026-01-31", 2)] });
    const s = computePeriodStats(p, "2026-03-01");
    expect(s.asOf).toBe("2026-01-31");
    expect(s.daysToEnd).toBe(0);
    expect(s.phase).toEqual({ kind: "over" });
    expect(s.total).toBe(5);
    expect(s.last7).toBe(5);
    expect(s.todayHours).toBeNull();
  });

  it("asOf is today while the period runs", () => {
    const s = computePeriodStats(period(), "2026-01-20");
    expect(s.asOf).toBe("2026-01-20");
    expect(s.daysToEnd).toBe(11);
  });

  it("todayHours is null before the period starts", () => {
    expect(computePeriodStats(period(), "2026-01-01").todayHours).toBeNull();
  });

  it("splits hours per course and unassigned", () => {
    const p = period({
      courses: [course("a"), course("b")],
      entries: [entry("2026-01-05", 2, "a"), entry("2026-01-06", 1, "b"), entry("2026-01-06", 1, null)],
    });
    const s = computePeriodStats(p, "2026-01-10");
    expect(s.courses.map((c) => [c.course.id, c.hours, c.days, c.lastStudied, c.share])).toEqual([
      ["a", 2, 1, "2026-01-05", 0.5],
      ["b", 1, 1, "2026-01-06", 0.25],
    ]);
    expect(s.unassigned).toBe(1);
  });
});

describe("phaseOf / phaseLabel", () => {
  const p = period(); // blok 2026-01-26, end 2026-01-31

  it("lessons before the blok", () => {
    expect(phaseOf(p, "2026-01-25")).toEqual({ kind: "lessons", daysToBlok: 1 });
    expect(phaseOf(p, "2026-01-05")).toEqual({ kind: "lessons", daysToBlok: 21 });
  });

  it("blokStart day is blok day 1, endDate the last blok day", () => {
    expect(phaseOf(p, "2026-01-26")).toEqual({ kind: "blok", day: 1, of: 6 });
    expect(phaseOf(p, "2026-01-31")).toEqual({ kind: "blok", day: 6, of: 6 });
  });

  it("after endDate is over", () => {
    expect(phaseOf(p, "2026-02-01")).toEqual({ kind: "over" });
  });

  it("labels", () => {
    expect(phaseLabel({ kind: "over" })).toBe("Period over");
    expect(phaseLabel({ kind: "blok", day: 5, of: 34 })).toBe("Blok day 5 of 34");
    expect(phaseLabel({ kind: "lessons", daysToBlok: 0 })).toBe("Blok starts today");
    expect(phaseLabel({ kind: "lessons", daysToBlok: 1 })).toBe("Blok in 1 day");
    expect(phaseLabel({ kind: "lessons", daysToBlok: 21 })).toBe("Blok in 21 days");
  });
});

describe("pickCurrentPeriod", () => {
  const old = { id: "old", startDate: "2025-01-01", endDate: "2025-06-30" };
  const now = { id: "now", startDate: "2026-01-01", endDate: "2026-06-30" };
  const next = { id: "next", startDate: "2026-09-01", endDate: "2027-01-31" };
  const later = { id: "later", startDate: "2027-02-01", endDate: "2027-06-30" };

  it("prefers the period running today", () => {
    expect(pickCurrentPeriod([old, next, now], "2026-03-01")?.id).toBe("now");
  });

  it("else the latest one that started", () => {
    expect(pickCurrentPeriod([old, now, next], "2026-07-15")?.id).toBe("now");
  });

  it("else the newest future one", () => {
    expect(pickCurrentPeriod([next, later], "2026-07-15")?.id).toBe("later");
  });

  it("null without periods", () => {
    expect(pickCurrentPeriod([], "2026-07-15")).toBeNull();
  });
});

describe("lesson weeks", () => {
  it("lessonWeekOf is 1-based from the start Monday", () => {
    const p = period();
    expect(lessonWeekOf(p, "2026-01-05")).toBe(1);
    expect(lessonWeekOf(p, "2026-01-11")).toBe(1);
    expect(lessonWeekOf(p, "2026-01-12")).toBe(2);
    expect(lessonWeekOf(p, "2026-01-26")).toBe(4);
  });

  it("lessonWeekCount covers weeks up to the blok, at least 1, plus later marked weeks", () => {
    expect(lessonWeekCount(period())).toBe(3); // 21 days
    expect(lessonWeekCount(period({ blokStart: "2026-01-27" }))).toBe(4); // 22 days → partial week
    expect(lessonWeekCount(period({ blokStart: "2026-01-05" }))).toBe(1);
    expect(
      lessonWeekCount(period({ marks: [{ courseId: "a", week: 5, kind: "HC", status: "attended" }] }))
    ).toBe(5);
  });
});

describe("isFinished / peerPeriods", () => {
  it("isFinished only after the last exam day", () => {
    const p = period();
    expect(isFinished(p, "2026-01-31")).toBe(false);
    expect(isFinished(p, "2026-02-01")).toBe(true);
  });

  it("keeps earlier, finished periods with entries", () => {
    const active = period({ id: "active", endDate: "2026-06-30" });
    const finished = period({ id: "f", endDate: "2025-06-30", entries: [entry("2025-06-01", 1)] });
    const empty = period({ id: "empty", endDate: "2025-01-31" });
    const later = period({ id: "later", endDate: "2026-01-31", entries: [entry("2026-01-10", 1)] });
    // `later` is finished but ends after the viewed (old) period → not a peer of it
    const oldActive = period({ id: "old", endDate: "2025-12-31" });
    const all = [active, finished, empty, later, oldActive];
    expect(peerPeriods(active, all, "2026-03-01").map((p) => p.id)).toEqual(["f", "later"]);
    expect(peerPeriods(oldActive, all, "2026-03-01").map((p) => p.id)).toEqual(["f"]);
    // a peer still running isn't finished
    expect(peerPeriods(active, all, "2026-01-20").map((p) => p.id)).toEqual(["f"]);
  });
});

// Three imported periods (before LOGGED_IN_APP_FROM), all ending on Jan 31;
// x = -(days before the last exam).
//   p1 (2024): x=-10: 1h, x=-8: 10h, x=-6: 2h, x=0: 3h   (first = -10)
//   p2 (2025): x=-5: 4h, x=0: 1h                          (first = -5)
//   active (2026): x=-8: 5h, x=-6: 1h, today = x=-6       (first = -8)
function threePeriods() {
  const p1 = period({
    id: "p1",
    name: "2024",
    startDate: "2023-12-04",
    blokStart: "2024-01-15",
    endDate: "2024-01-31",
    entries: [entry("2024-01-21", 1), entry("2024-01-23", 10), entry("2024-01-25", 2), entry("2024-01-31", 3)],
  });
  const p2 = period({
    id: "p2",
    name: "2025",
    startDate: "2024-12-02",
    blokStart: "2025-01-13",
    endDate: "2025-01-31",
    entries: [entry("2025-01-26", 4), entry("2025-01-31", 1)],
  });
  const active = period({
    id: "active",
    name: "2026",
    entries: [entry("2026-01-23", 5), entry("2026-01-25", 1)],
  });
  return { p1, p2, active, all: [p1, p2, active], today: "2026-01-25" };
}

describe("comparePace", () => {
  it("null without peers", () => {
    const { active } = threePeriods();
    expect(comparePace(active, [active], "2026-01-25")).toBeNull();
  });

  it("null when the viewed period has no entries", () => {
    const { p1, p2 } = threePeriods();
    const empty = period({ id: "active" });
    expect(comparePace(empty, [p1, p2, empty], "2026-01-25")).toBeNull();
  });

  it("fills an imported peer's days before its first log from the most recent other period, and leaves fully filled peers out of the average", () => {
    const { all, active, today } = threePeriods();
    const pace = comparePace(active, all, today)!;
    expect(pace.daysToEnd).toBe(6);
    // the viewed period is never filled in: 5 + 1
    expect(pace.mine).toBe(6);
    expect(pace.mineLast7).toBe(6);

    const p1 = pace.peers.find((p) => p.id === "p1")!;
    const p2 = pace.peers.find((p) => p.id === "p2")!;
    // p1 logged from x=-10: real 1 + 10 + 2
    expect(p1).toEqual({ id: "p1", name: "2024", theirs: 13, last7: 13, total: 16, filled: false });
    // p2 hadn't logged yet at x=-6: filled from p1 (1 + 10 + 2), never from
    // the viewed period, so logging more now doesn't move the older lines
    expect(p2).toEqual({ id: "p2", name: "2025", theirs: 13, last7: 13, total: 5, filled: true });

    expect(pace.loggedCount).toBe(1);
    // theirs/last7 only from p1; total/remaining from both
    expect(pace.avg.theirs).toBe(13);
    expect(pace.avg.last7).toBe(13);
    expect(pace.avg.total).toBe(10.5);
    // remaining: p1 16 - 13 = 3, p2 (13 + 4 + 1) - 13 = 5
    expect(pace.avg.remaining).toBe(4);
  });

  it("averages over all peers when every peer is still filled in", () => {
    const { p2, active } = threePeriods();
    const pace = comparePace(active, [p2, active], "2026-01-25")!;
    expect(pace.loggedCount).toBe(0);
    // p2 at x=-6: nothing to fill from (p1 not passed, the viewed period never counts)
    expect(pace.peers[0]).toMatchObject({ id: "p2", theirs: 0, filled: true });
    expect(pace.avg.theirs).toBe(0);
  });
});

describe("countdownChart", () => {
  it("one point per day from the earliest common start to the last exam, with logged and filled parts", () => {
    const { all, active, today } = threePeriods();
    const { points, series, hasAvg } = countdownChart(active, all, today);

    expect(points.map((p) => p.x)).toEqual([-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0]);
    expect(series).toEqual([
      { key: "active", filledKey: "active~filled", name: "2026", active: true },
      { key: "p1", filledKey: "p1~filled", name: "2024", active: false },
      { key: "p2", filledKey: "p2~filled", name: "2025", active: false },
    ]);
    expect(hasAvg).toBe(true);

    const byX = (x: number) => points.find((p) => p.x === x)!;

    // active: nothing before its first log, stops at today, never filled beyond the joint
    expect(byX(-10).active).toBeNull();
    expect(byX(-8).active).toBe(5);
    expect(byX(-6).active).toBe(6);
    expect(byX(-5).active).toBeNull();
    expect(points.filter((p) => p["active~filled"] !== null).map((p) => p.x)).toEqual([-8]);

    // p1: all logged
    expect(points.filter((p) => p["p1~filled"] !== null).map((p) => p.x)).toEqual([-10]);
    expect(byX(0).p1).toBe(16);

    // p2: filled up to and including its first log (so the parts connect), logged from there
    expect(points.filter((p) => p["p2~filled"] !== null).map((p) => p.x)).toEqual([-10, -9, -8, -7, -6, -5]);
    expect(points.filter((p) => p.p2 !== null).map((p) => p.x)).toEqual([-5, -4, -3, -2, -1, 0]);
    expect(byX(-6)["p2~filled"]).toBe(13);
    expect(byX(-5).p2).toBe(17);
    expect(byX(0).p2).toBe(18);

    // avg: only p1 while p2 is all filled in, both afterwards
    expect(byX(-6).avg).toBe(13);
    expect(byX(-3).avg).toBe(15); // (13 + 17) / 2
    expect(byX(0).avg).toBe(17); // (16 + 18) / 2
  });

  it("no avg with a single peer", () => {
    const { p1, active } = threePeriods();
    expect(countdownChart(active, [p1, active], "2026-01-25").hasAvg).toBe(false);
  });
});

// Semesters logged in the app (from 3.1 on) are never filled in: a day without a
// log is 0 h, so starting earlier than before shows as ahead.
describe("app-logged peers", () => {
  // Both end on a Friday in December; x = -(days before the last exam).
  //   app (3.1): x=-8: 4h                  (first = -8)
  //   next (viewed): x=-12: 3h, x=-8: 2h   (first = -12, today = x=-8)
  const app = period({
    id: "app",
    name: "3.1",
    startDate: "2026-09-07",
    blokStart: "2026-12-07",
    endDate: "2026-12-18",
    entries: [entry("2026-12-10", 4)],
  });
  const next = period({
    id: "next",
    name: "4.1",
    startDate: "2027-09-06",
    blokStart: "2027-12-06",
    endDate: "2027-12-17",
    entries: [entry("2027-12-05", 3), entry("2027-12-09", 2)],
  });
  const today = "2027-12-09";

  it("counts the days before their first log as 0, not borrowed from the viewed period", () => {
    const pace = comparePace(next, [app, next], today)!;
    expect(pace.mine).toBe(5);
    expect(pace.peers[0]).toMatchObject({ id: "app", theirs: 4, filled: false });
    expect(pace.loggedCount).toBe(1);
  });

  it("draws them as logged from the common start", () => {
    const { points } = countdownChart(next, [app, next], today);
    const byX = (x: number) => points.find((p) => p.x === x)!;
    expect(points[0].x).toBe(-12);
    expect(byX(-12).app).toBe(0);
    expect(byX(-9).app).toBe(0);
    expect(byX(-8).app).toBe(4);
    // only the joint point at the very start, nothing really filled in
    expect(points.filter((p) => p["app~filled"] !== null).map((p) => p.x)).toEqual([-12]);
    expect(byX(-12)["app~filled"]).toBe(0);
  });
});
