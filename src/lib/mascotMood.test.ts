import { describe, it, expect } from "vitest";
import { BEER_THIRSTY_DAYS, moodFor, type MoodInput } from "./mascotMood";

const TODAY = "2026-11-08";
const NOON = 12;
const mood = (input: MoodInput, hour = NOON) => moodFor(input, "Penny", TODAY, hour).mood;

describe("budget", () => {
  const b = (spent: number, over = false) => ({ kind: "budget" as const, budget: { over, spent, budget: 300, timeProgress: 0.5 } });
  it("worries when over budget or ahead of the calendar", () => {
    expect(mood(b(400, true))).toBe("worried");
    expect(mood(b(151))).toBe("worried");
  });
  it("is calm exactly on plan and happy well under it", () => {
    expect(mood(b(150))).toBe("default");
    expect(mood(b(120))).toBe("happy");
    expect(mood(b(0))).toBe("happy");
  });
  it("says how far ahead", () => {
    expect(moodFor(b(168), "Penny", TODAY, NOON).line).toContain("18,00 ahead");
  });
  it("is neutral without a period", () => {
    expect(mood({ kind: "budget", budget: null })).toBe("default");
  });
});

describe("lessons", () => {
  const l = (todayHours: number, extra: Partial<{ examInDays: number | null; timerRunning: boolean }> = {}) => ({
    kind: "lessons" as const,
    lessons: { todayHours, goalHours: 4, examInDays: null, timerRunning: false, ...extra },
  });
  it("sleeps until you study, unless a timer runs", () => {
    expect(mood(l(0))).toBe("sleepy");
    expect(mood(l(0, { timerRunning: true }))).toBe("default");
  });
  it("is happy once the goal is met", () => {
    expect(mood(l(4))).toBe("happy");
    expect(mood(l(2))).toBe("default");
  });
  it("stays awake with an exam close", () => {
    expect(mood(l(0, { examInDays: 2 }))).toBe("default");
    expect(mood(l(0, { examInDays: 4 }))).toBe("sleepy");
  });
  it("is neutral without a period", () => {
    expect(mood({ kind: "lessons", lessons: null })).toBe("default");
  });
});

describe("other sections", () => {
  it("reminders: overdue worries, empty is happy", () => {
    expect(mood({ kind: "reminders", open: 3, overdue: 1 })).toBe("worried");
    expect(mood({ kind: "reminders", open: 0, overdue: 0 })).toBe("happy");
    expect(mood({ kind: "reminders", open: 2, overdue: 0 })).toBe("default");
  });
  it("beer: today is happy, long ago or never is sleepy", () => {
    expect(mood({ kind: "beer", lastVisit: TODAY })).toBe("happy");
    expect(mood({ kind: "beer", lastVisit: null })).toBe("sleepy");
    expect(mood({ kind: "beer", lastVisit: "2026-10-25" })).toBe("sleepy"); // exactly 14 days
    expect(BEER_THIRSTY_DAYS).toBe(14);
    expect(mood({ kind: "beer", lastVisit: "2026-10-26" })).toBe("default");
  });
  it("wardrobe: full basket worries, empty basket is happy, no clothes is neutral", () => {
    const fresh = { coloured: "2026-11-06", white: "2026-11-01" };
    expect(mood({ kind: "wardrobe", items: 20, wash: 8, lastWash: fresh })).toBe("worried");
    expect(mood({ kind: "wardrobe", items: 20, wash: 0, lastWash: fresh })).toBe("happy");
    expect(mood({ kind: "wardrobe", items: 20, wash: 2, lastWash: fresh })).toBe("default");
    expect(mood({ kind: "wardrobe", items: 0, wash: 0, lastWash: { coloured: null, white: null } })).toBe("default");
  });
  it("wardrobe: worries when either load hasn't been washed in 10 days", () => {
    const w = (coloured: string | null, white: string | null) =>
      moodFor({ kind: "wardrobe", items: 20, wash: 0, lastWash: { coloured, white } }, "Woolly", TODAY, NOON);
    expect(w("2026-11-06", "2026-10-29").mood).toBe("worried"); // white: exactly 10 days
    expect(w("2026-11-06", "2026-10-29").line).toContain("no white wash in 10 days");
    expect(w("2026-10-20", "2026-11-06").line).toContain("no coloured wash in 19 days");
    expect(w("2026-11-06", "2026-10-30").mood).toBe("happy"); // 9 days
    expect(w(null, null).mood).toBe("happy"); // never washed in the app: nothing to count from
  });
  it("people: a birthday beats catching up", () => {
    expect(mood({ kind: "people", total: 5, birthdayToday: "Anna", catchUp: 2 })).toBe("happy");
    expect(mood({ kind: "people", total: 5, birthdayToday: null, catchUp: 1 })).toBe("worried");
  });
  it("diary, waypoint and recipes", () => {
    expect(mood({ kind: "diary", wroteToday: true })).toBe("happy");
    expect(mood({ kind: "diary", wroteToday: false })).toBe("default");
    expect(mood({ kind: "waypoint", latest: null })).toBe("default");
    expect(mood({ kind: "recipes", lastMade: "Dahl" })).toBe("default");
  });
});

describe("workouts", () => {
  const w = (o: Partial<Extract<MoodInput, { kind: "workouts" }>> = {}): MoodInput => ({
    kind: "workouts",
    live: false,
    todayDone: false,
    goal: 3,
    done: 1,
    left: 2,
    daysLeft: 4,
    behind: false,
    missed: false,
    lastOn: "2026-11-06",
    ...o,
  });
  it("cheers during a session and after one today or a met goal", () => {
    expect(mood(w({ live: true, behind: true }))).toBe("happy");
    expect(mood(w({ todayDone: true }))).toBe("happy");
    expect(mood(w({ done: 3, left: 0 }))).toBe("happy");
  });
  it("worries when behind, says how many to go", () => {
    const m = moodFor(w({ behind: true, left: 2, daysLeft: 2 }), "Coach Ramsay", TODAY, NOON);
    expect(m.mood).toBe("worried");
    expect(m.line).toContain("2 to go, 2 days left");
  });
  it("looks ahead instead of counting down once the week's goal can't be made", () => {
    const m = moodFor(w({ missed: true, left: 2, daysLeft: 1 }), "Coach Ramsay", TODAY, NOON);
    expect(m.mood).toBe("default");
    expect(m.line).toContain("next week");
    expect(m.line).not.toContain("more this week");
  });
  it("dozes off after a week without one, waits when there's none yet", () => {
    expect(mood(w({ lastOn: "2026-11-01" }))).toBe("sleepy"); // 7 days
    expect(mood(w({ lastOn: "2026-11-02" }))).toBe("default");
    expect(mood(w({ lastOn: null, done: 0, left: 3 }))).toBe("default");
    expect(mood(w({ goal: null, left: 0, done: 0, lastOn: "2026-11-05" }))).toBe("default");
  });
});

describe("night", () => {
  it("everyone not worried sleeps before 6", () => {
    expect(mood({ kind: "diary", wroteToday: true }, 2)).toBe("sleepy");
    expect(mood({ kind: "reminders", open: 1, overdue: 1 }, 2)).toBe("worried");
    expect(mood({ kind: "diary", wroteToday: true }, 6)).toBe("happy");
  });
});
