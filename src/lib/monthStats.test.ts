import { describe, it, expect } from "vitest";
import {
  MIN_PINT_AMOUNT,
  computeMonthStats,
  cumulativeAtDay,
  guessPints,
  pintsOf,
  type Month,
  type MonthExpense,
} from "@/lib/monthStats";

let nextId = 0;
function expense(date: string, amount: number, extra: Partial<MonthExpense> = {}): MonthExpense {
  return {
    id: `e${nextId++}`,
    date,
    amount,
    note: null,
    categoryId: "food",
    categoryName: "Food",
    categoryColor: "a",
    pintPrice: null,
    pints: null,
    ...extra,
  };
}

/** November 2026 (30 days) with a budget of 300 = 10 a day. */
function month(extra: Partial<Month> = {}): Month {
  return {
    kind: "month",
    id: "m1",
    name: "November",
    label: "Galway",
    budget: 300,
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    bank: 0,
    tricount: 0,
    cash: 0,
    balancesUpdatedAt: null,
    rent: 0,
    rentDay: null,
    expenses: [],
    ...extra,
  };
}

describe("guessPints / pintsOf", () => {
  it("guesses amount ÷ price, at least 1", () => {
    expect(guessPints(12, 6)).toBe(2);
    expect(guessPints(14, 6)).toBe(2);
    expect(guessPints(3, 6)).toBe(1);
  });

  it("prefers the counted number", () => {
    expect(pintsOf({ amount: 12, pintPrice: 6, pints: 3 })).toBe(3);
    expect(pintsOf({ amount: 2, pintPrice: 6, pints: 1 })).toBe(1);
  });

  it("guesses when nothing was counted (0 counts as not counted)", () => {
    expect(pintsOf({ amount: 12, pintPrice: 6, pints: null })).toBe(2);
    expect(pintsOf({ amount: 12, pintPrice: 6, pints: 0 })).toBe(2);
  });

  it("treats a cheap guessed beer as food", () => {
    expect(pintsOf({ amount: MIN_PINT_AMOUNT - 0.01, pintPrice: 6, pints: null })).toBe(0);
    expect(pintsOf({ amount: MIN_PINT_AMOUNT, pintPrice: 6, pints: null })).toBe(1);
  });

  it("is 0 outside a beer category", () => {
    expect(pintsOf({ amount: 12, pintPrice: null, pints: 2 })).toBe(0);
    expect(pintsOf({ amount: 12, pintPrice: 0, pints: 2 })).toBe(0);
  });
});

describe("computeMonthStats", () => {
  it("handles a period that hasn't started", () => {
    const stats = computeMonthStats(month({ rent: 500, rentDay: 5 }), "2026-10-29");
    expect(stats.isFuture).toBe(true);
    expect(stats.isCurrent).toBe(false);
    expect(stats.daysElapsed).toBe(0);
    expect(stats.daysLeft).toBe(30);
    expect(stats.today).toBeNull();
    expect(stats.daily.every((d) => d.cumulative === null)).toBe(true);
    expect(stats.outlook.rentStillDue).toBe(500);
  });

  it("leaves the cumulative empty after today", () => {
    const m = month({ expenses: [expense("2026-11-01", 4), expense("2026-11-02", 6), expense("2026-11-05", 9)] });
    const stats = computeMonthStats(m, "2026-11-03");
    expect(stats.daily.slice(0, 4).map((d) => d.cumulative)).toEqual([4, 10, 10, null]);
    expect(stats.daily[4].total).toBe(9);
    expect(stats.spent).toBe(19);
  });

  it("counts rent as still due on rent day, paid the day after", () => {
    const m = month({ bank: 1000, rent: 500, rentDay: 5 });
    expect(computeMonthStats(m, "2026-11-05").outlook.rentStillDue).toBe(500);
    expect(computeMonthStats(m, "2026-11-05").outlook.available).toBe(500);
    expect(computeMonthStats(m, "2026-11-06").outlook.rentStillDue).toBe(0);
  });

  it("pays rent day 31 on the last day of a 30-day month", () => {
    const m = month({ rent: 500, rentDay: 31 });
    expect(computeMonthStats(m, "2026-11-30").outlook.rentStillDue).toBe(500);
    expect(computeMonthStats(m, "2026-12-01").outlook.rentStillDue).toBe(0);
  });

  it("splits what's left over the days left, today included", () => {
    const m = month({ expenses: [expense("2026-11-01", 20), expense("2026-11-03", 4)] });
    const today = computeMonthStats(m, "2026-11-03").today!;
    expect(today.daysLeftInclToday).toBe(28);
    expect(today.allowanceToday).toBe(10); // (300 − 20) / 28
    expect(today.spentToday).toBe(4);
    expect(today.leftToday).toBe(6);
    expect(today.budgetLeft).toBe(276);
    expect(today.budgetGoneBeforeToday).toBe(false);
  });

  it("hands out nothing once the budget is gone", () => {
    const m = month({ expenses: [expense("2026-11-01", 350), expense("2026-11-10", 5)] });
    const today = computeMonthStats(m, "2026-11-10").today!;
    expect(today.allowanceToday).toBe(0);
    expect(today.budgetGoneBeforeToday).toBe(true);
    expect(today.leftToday).toBe(-5);
    expect(today.budgetLeft).toBe(-55);
  });

  it("counts beer with pintsOf", () => {
    const beer = { categoryId: "beer", categoryName: "Bier", pintPrice: 6 };
    const m = month({
      expenses: [
        expense("2026-11-01", 12, beer),
        expense("2026-11-02", 15, { ...beer, pints: 3 }),
        expense("2026-11-02", 3, beer), // crisps
        expense("2026-11-02", 20),
      ],
    });
    const { beer: stats } = computeMonthStats(m, "2026-11-30");
    expect(stats.pints).toBe(5);
    expect(stats.spend).toBe(27);
    expect(stats.avgPricePerPint).toBeCloseTo(5.4);
  });
});

describe("cumulativeAtDay", () => {
  const stats = computeMonthStats(
    month({ expenses: [expense("2026-11-01", 5), expense("2026-11-15", 10), expense("2026-11-30", 1)] }),
    "2026-12-01"
  );

  it("sums up to the given day", () => {
    expect(cumulativeAtDay(stats, 1)).toBe(5);
    expect(cumulativeAtDay(stats, 14)).toBe(5);
    expect(cumulativeAtDay(stats, 15)).toBe(15);
  });

  it("is 0 for day 0 or before", () => {
    expect(cumulativeAtDay(stats, 0)).toBe(0);
    expect(cumulativeAtDay(stats, -3)).toBe(0);
  });

  it("clamps past the end to the full total", () => {
    expect(cumulativeAtDay(stats, 31)).toBe(16);
    expect(cumulativeAtDay(stats, 99)).toBe(16);
  });
});
