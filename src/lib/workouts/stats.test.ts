import { describe, it, expect } from "vitest";
import {
  byActivity,
  byWeekday,
  describeTempo,
  exerciseBests,
  formatPace,
  lastSetsFor,
  monthToDate,
  pace,
  streakWeeks,
  weekProgress,
  weeklyTotals,
  type SetLite,
  type WorkoutLite,
} from "./stats";
import { formatMinutes, formatSeconds } from "./types";
import { formatChange, weightTrend } from "./weight";

// 2026-11-08 is a Sunday; its week starts Monday 2026-11-02.
const w = (date: string, extra: Partial<WorkoutLite> = {}): WorkoutLite => ({
  id: `${date}-${Math.random()}`,
  date,
  durationMin: 30,
  distanceKm: null,
  activityId: "run",
  activityName: "Running",
  kind: "cardio",
  ...extra,
});

describe("weekProgress", () => {
  it("counts the Mon–Sun week and what's left", () => {
    const p = weekProgress([w("2026-11-02"), w("2026-11-04"), w("2026-11-01")], 3, "2026-11-05");
    expect(p.monday).toBe("2026-11-02");
    expect(p.done).toBe(2); // Sunday 1 Nov belongs to last week
    expect(p.left).toBe(1);
    expect(p.daysLeft).toBe(4); // Thu–Sun
    expect(p.behind).toBe(false);
    expect(p.met).toBe(false);
  });
  it("is behind when every open day is needed", () => {
    // Saturday, 1 of 3: Saturday and Sunday both needed.
    const p = weekProgress([w("2026-11-02")], 3, "2026-11-07");
    expect(p.behind).toBe(true);
    expect(p.reachable).toBe(true);
    // Sunday, 1 of 3: can't make it any more.
    const q = weekProgress([w("2026-11-02")], 3, "2026-11-08");
    expect(q.behind).toBe(true);
    expect(q.reachable).toBe(false);
  });
  it("doesn't count today as open once you trained today", () => {
    const p = weekProgress([w("2026-11-07")], 3, "2026-11-07");
    expect(p.todayDone).toBe(true);
    expect(p.left).toBe(2);
    expect(p.behind).toBe(true); // only Sunday is left for two sessions
    expect(p.reachable).toBe(false);
  });
  it("has nothing left without a goal or once met", () => {
    expect(weekProgress([w("2026-11-02")], null, "2026-11-08")).toMatchObject({ left: 0, behind: false, met: false });
    expect(weekProgress([w("2026-11-02"), w("2026-11-03")], 2, "2026-11-03")).toMatchObject({ left: 0, met: true, behind: false });
  });
});

describe("streakWeeks", () => {
  const history = [
    w("2026-10-13"), w("2026-10-15"), // week of 12 Oct: 2
    w("2026-10-19"), w("2026-10-21"), // week of 19 Oct: 2
    w("2026-10-27"), w("2026-10-30"), // week of 26 Oct: 2
  ];
  it("counts met weeks back from last week, the running one only once met", () => {
    expect(streakWeeks(history, 2, "2026-11-03")).toBe(3);
    expect(streakWeeks([...history, w("2026-11-02"), w("2026-11-03")], 2, "2026-11-03")).toBe(4);
  });
  it("a gap ends it, and no goal means no streak", () => {
    expect(streakWeeks([w("2026-10-19"), w("2026-10-21")], 2, "2026-11-03")).toBe(0);
    expect(streakWeeks(history, null, "2026-11-03")).toBe(0);
  });
});

describe("totals", () => {
  const list = [
    w("2026-11-02", { distanceKm: 5.2, durationMin: 28 }),
    w("2026-11-03", { activityId: "yoga", activityName: "Yoga", kind: "sport", durationMin: 60 }),
    w("2026-10-26", { distanceKm: 4.8, durationMin: 25 }),
  ];
  it("weekly totals, oldest first", () => {
    const weeks = weeklyTotals(list, "2026-11-08", 2);
    expect(weeks.map((x) => x.monday)).toEqual(["2026-10-26", "2026-11-02"]);
    expect(weeks[1]).toMatchObject({ sessions: 2, minutes: 88, km: 5.2 });
  });
  it("per activity and weekday", () => {
    expect(byActivity(list)[0]).toMatchObject({ name: "Running", sessions: 2, km: 10 });
    expect(byWeekday(list)).toEqual([2, 1, 0, 0, 0, 0, 0]);
  });
  it("month to date vs the same days last month (clamped)", () => {
    const m = monthToDate([w("2026-03-02"), w("2026-02-27"), w("2026-02-28"), w("2026-03-31")], "2026-03-31");
    expect(m.thisMonth.sessions).toBe(2);
    expect(m.lastMonth.sessions).toBe(2); // Feb has 28 days
  });
});

describe("pace", () => {
  it("min/km, formatted, and speed for cycling", () => {
    expect(pace(5, 26)).toBeCloseTo(5.2);
    expect(formatPace(5.2)).toBe("5:12 /km");
    expect(formatPace(4.999)).toBe("5:00 /km");
    expect(pace(null, 30)).toBeNull();
    expect(describeTempo("Cycling", 20, 50)).toBe("24 km/h");
    expect(describeTempo("Running", 5, 26)).toBe("5:12 /km");
  });
});

describe("exercises", () => {
  const s = (workoutId: string, date: string, value: number, exerciseId = "pu"): SetLite & { position: number } => ({
    workoutId,
    date,
    exerciseId,
    exerciseName: exerciseId === "pu" ? "Push-ups" : "Plank",
    measure: exerciseId === "pu" ? "reps" : "time",
    value,
    position: 0,
  });
  const sets = [s("a", "2026-10-01", 10), s("a", "2026-10-01", 8), s("b", "2026-10-08", 12), s("b", "2026-10-08", 12), s("c", "2026-10-09", 60, "pl")];
  it("bests per exercise: set, session, history", () => {
    const pu = exerciseBests(sets).find((e) => e.exerciseId === "pu")!;
    expect(pu).toMatchObject({ bestSet: 12, bestSetOn: "2026-10-08", bestSession: 24, sessions: 2, lastOn: "2026-10-08" });
    expect(pu.history).toEqual([{ date: "2026-10-01", best: 10 }, { date: "2026-10-08", best: 12 }]);
  });
  it("prefills from the newest earlier workout", () => {
    const withPos = [{ ...s("a", "2026-10-01", 10), position: 0 }, { ...s("b", "2026-10-08", 12), position: 1 }, { ...s("b", "2026-10-08", 11), position: 0 }];
    expect(lastSetsFor(withPos, "pu")).toEqual([11, 12]);
    expect(lastSetsFor(withPos, "pu", "b")).toEqual([10]);
    expect(lastSetsFor(withPos, "nope")).toEqual([]);
  });
});

describe("formatting and weight", () => {
  it("formats durations", () => {
    expect(formatSeconds(45)).toBe("45 s");
    expect(formatSeconds(65)).toBe("1:05");
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(80)).toBe("1 h 20");
  });
  it("weight trend: latest, 7-day average, changes", () => {
    const t = weightTrend([
      { date: "2026-08-01", kg: 80 },
      { date: "2026-10-01", kg: 79 },
      { date: "2026-11-02", kg: 78.4 },
      { date: "2026-11-08", kg: 78 },
    ])!;
    expect(t.latest.kg).toBe(78);
    expect(t.average7).toBe(78.2);
    expect(t.change30).toBe(-1);
    expect(t.change90).toBe(-2);
    expect(weightTrend([])).toBeNull();
    expect(formatChange(-1.2)).toBe("−1,2 kg");
    expect(formatChange(0)).toBe("±0 kg");
  });
});
