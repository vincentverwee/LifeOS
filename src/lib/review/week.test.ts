import { describe, expect, it } from "vitest";
import { buildStory, defaultWeek, parseWeek, studyWeek, summarizeWeek, weekDays, type WeekRaw } from "./week";

const MONDAY = "2026-11-02";
const SUNDAY = "2026-11-08";

function raw(over: Partial<WeekRaw> = {}): WeekRaw {
  return {
    monday: MONDAY,
    todayKey: "2026-11-20",
    expenses: [],
    prevExpenses: [],
    budgetRanges: [],
    studyPeriod: null,
    studyEntries: [],
    prevStudyHours: 0,
    diary: [],
    routineLogs: [],
    remindersDone: [],
    outfitWears: [],
    itemWears: 0,
    recipes: [],
    trips: [],
    win: null,
    ...over,
  };
}

const expense = (date: string, amount: number, extra: Partial<WeekRaw["expenses"][number]> = {}) => ({
  date,
  amount,
  category: "Food",
  pintPrice: null,
  pints: null,
  sizeMl: null,
  pub: null,
  ...extra,
});

describe("which week", () => {
  it("shows the ending week on Sunday, else the last full one", () => {
    expect(defaultWeek(SUNDAY)).toBe(MONDAY);
    expect(defaultWeek("2026-11-09")).toBe(MONDAY); // Monday after
    expect(defaultWeek("2026-11-12")).toBe(MONDAY); // Thursday → last week
  });

  it("only takes a Monday that isn't in the future", () => {
    expect(parseWeek(MONDAY, SUNDAY)).toBe(MONDAY);
    expect(parseWeek("2026-11-03", SUNDAY)).toBeNull(); // a Tuesday
    expect(parseWeek("2026-11-09", SUNDAY)).toBeNull(); // next week
    expect(parseWeek("nonsense", SUNDAY)).toBeNull();
  });

  it("stops the running week at today", () => {
    expect(weekDays(MONDAY, "2026-11-04")).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(weekDays(MONDAY, "2026-12-01")).toHaveLength(7);
  });
});

describe("studyWeek", () => {
  const period = { startDate: "2026-09-14", endDate: "2027-01-30", goalHours: 4 };
  it("leaves days off out of the goal and counts days at the goal", () => {
    const days = weekDays(MONDAY, SUNDAY);
    const s = studyWeek(days, period, [
      { date: "2026-11-02", hours: 4, note: null },
      { date: "2026-11-03", hours: 2.5, note: null },
      { date: "2026-11-04", hours: 0, note: "sick" },
    ]);
    expect(s.hours).toBe(6.5);
    expect(s.goalDays).toBe(6);
    expect(s.atGoal).toBe(1);
    expect(s.daysOff).toBe(1);
    expect(s.perDay).toEqual([4, 2.5, 0, 0, 0, 0, 0]);
  });

  it("only counts days inside the period", () => {
    const s = studyWeek(weekDays(MONDAY, SUNDAY), { ...period, endDate: "2026-11-04" }, []);
    expect(s.goalDays).toBe(3);
  });
});

describe("summarizeWeek", () => {
  it("adds up money per day and category against the week's budget share", () => {
    const week = summarizeWeek(
      raw({
        expenses: [expense("2026-11-02", 10), expense("2026-11-02", 5, { category: "Bus" }), expense("2026-11-05", 20)],
        prevExpenses: [expense("2026-10-27", 12)],
        budgetRanges: [{ budget: 300, start: "2026-11-01", end: "2026-11-30" }],
      })
    );
    expect(week.money.total).toBe(35);
    expect(week.money.budget).toBe(70); // 7 days of 10/day
    expect(week.money.perDay[0]).toBe(15);
    expect(week.money.categories[0]).toEqual({ name: "Food", amount: 30 });
    expect(week.money.prevTotal).toBe(12);
  });

  it("splits the budget across months, a trip winning over the month", () => {
    const week = summarizeWeek(
      raw({
        monday: "2026-10-26",
        budgetRanges: [
          { budget: 70, start: "2026-10-31", end: "2026-11-06" }, // a trip, 10/day
          { budget: 310, start: "2026-10-01", end: "2026-10-31" }, // 10/day
          { budget: 600, start: "2026-11-01", end: "2026-11-30" }, // 20/day
        ],
      })
    );
    expect(week.money.budget).toBe(70);
  });

  it("counts pints, pubs and the best diary bit", () => {
    const week = summarizeWeek(
      raw({
        expenses: [
          expense("2026-11-06", 12, { category: "Bier", pintPrice: 6, pub: "The Crane" }),
          expense("2026-11-07", 0, { category: "Bier", pintPrice: 6, pints: 2 }),
        ],
        diary: [
          { date: "2026-11-03", text: "Rainy\nGood coffee", mood: 3 },
          { date: "2026-11-06", text: "Passed the exam!", mood: 5 },
        ],
        routineLogs: [
          { name: "Plants", source: null },
          { name: "Plants", source: null },
          { name: "Wash (coloured)", source: "wardrobe-wash-coloured" },
        ],
      })
    );
    expect(week.beer.pints).toBe(4);
    expect(week.beer.pubs).toEqual(["The Crane"]);
    expect(week.diary.best).toBe("Passed the exam!");
    expect(week.diary.bits).toBe(3);
    expect(week.lastDone).toEqual([{ name: "Plants", count: 2 }]);
    expect(week.wardrobe.washes).toBe(1);
  });
});

describe("trips", () => {
  it("skips a long stay with nothing new this week, keeps one that started", () => {
    const week = summarizeWeek(
      raw({
        trips: [
          { title: "Erasmus", start: "2026-09-01", end: "2027-01-31", stops: [] },
          { title: "Weekend away", start: "2026-11-07", end: "2026-11-08", stops: ["Galway"] },
        ],
      })
    );
    expect(week.trips).toEqual([{ title: "Weekend away", days: 2, stops: ["Galway"] }]);
  });
});

describe("buildStory", () => {
  it("is only an intro and the win card for a quiet week", () => {
    const cards = buildStory(summarizeWeek(raw()), "sheep");
    expect(cards.map((c) => c.key)).toEqual(["intro", "outro"]);
  });

  it("adds a card per section with something in it, narrated by its mascot", () => {
    const cards = buildStory(
      summarizeWeek(
        raw({
          expenses: [expense("2026-11-06", 12, { category: "Bier", pintPrice: 6 })],
          recipes: ["Lasagne"],
        })
      ),
      "cat"
    );
    expect(cards.map((c) => c.key)).toEqual(["intro", "money", "beer", "recipes", "outro"]);
    expect(cards.find((c) => c.key === "recipes")?.speaker).toBe("Chef Purrcy");
  });

  it("says the same thing on every reload of a week", () => {
    const week = summarizeWeek(raw({ expenses: [expense("2026-11-03", 50)] }));
    expect(buildStory(week, "sheep")[1].line).toBe(buildStory(week, "sheep")[1].line);
  });
});
