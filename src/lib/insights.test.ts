import { describe, it, expect } from "vitest";
import { labelBaseline, labelSummaries, previousMonth, type PeriodEntry } from "@/lib/insights";
import { computeMonthStats, type Month, type MonthExpense } from "@/lib/monthStats";

const TODAY = "2026-10-15";

function expense(date: string, amount: number, categoryId = "food"): MonthExpense {
  return {
    id: `${date}-${amount}-${categoryId}`,
    date,
    amount,
    note: null,
    categoryId,
    categoryName: categoryId,
    categoryColor: "a",
    pintPrice: null,
    pints: null,
  };
}

/** A period with real stats as of TODAY. */
function period(
  id: string,
  startDate: string,
  endDate: string,
  extra: Partial<Month> = {}
): PeriodEntry {
  const month: Month = {
    kind: "month",
    id,
    name: id,
    label: "Galway",
    budget: 300,
    startDate,
    endDate,
    bank: 0,
    tricount: 0,
    cash: 0,
    balancesUpdatedAt: null,
    rent: 0,
    rentDay: null,
    expenses: [],
    ...extra,
  };
  return { month, stats: computeMonthStats(month, TODAY) };
}

describe("labelBaseline", () => {
  const october = period("oct", "2026-10-01", "2026-10-31", { expenses: [expense("2026-10-02", 50)] });

  it("is null without a label", () => {
    const active = period("oct", "2026-10-01", "2026-10-31", { label: null });
    const peer = period("sep", "2026-09-01", "2026-09-30", { label: null });
    expect(labelBaseline(active, [active, peer], TODAY)).toBeNull();
  });

  it("is null without finished peers of that label", () => {
    const otherLabel = period("aug", "2026-08-01", "2026-08-31", { label: "Thuis" });
    const running = period("oct-trip", "2026-10-10", "2026-10-20");
    expect(labelBaseline(october, [october, otherLabel, running], TODAY)).toBeNull();
  });

  it("leaves out the active period and unfinished peers", () => {
    const sep = period("sep", "2026-09-01", "2026-09-30", { expenses: [expense("2026-09-01", 100)] });
    const nov = period("nov", "2026-11-01", "2026-11-30", { expenses: [expense("2026-11-01", 999)] });
    const baseline = labelBaseline(october, [october, sep, nov], TODAY)!;
    expect(baseline.peerCount).toBe(1);
    expect(baseline.avgTotal).toBe(100);
    expect(baseline.atDay).toBe(100);
  });

  it("averages peers of different lengths by day of the period", () => {
    // 30 days, 60 on day 1 and 30 on day 20
    const sep = period("sep", "2026-09-01", "2026-09-30", {
      expenses: [expense("2026-09-01", 60, "food"), expense("2026-09-20", 30, "beer")],
    });
    // 31 days, 20 on day 1 and 31 on day 31
    const aug = period("aug", "2026-08-01", "2026-08-31", {
      expenses: [expense("2026-08-01", 20, "food"), expense("2026-08-31", 31, "food")],
    });
    const baseline = labelBaseline(october, [october, sep, aug], TODAY)!;

    expect(baseline.peerCount).toBe(2);
    expect(baseline.curve).toHaveLength(31);
    expect(baseline.curve[0]).toBe(40); // (60 + 20) / 2
    expect(baseline.curve[29]).toBe(55); // (90 + 20) / 2
    expect(baseline.curve[30]).toBe(70.5); // September stays at 90
    expect(baseline.avgTotal).toBe(70.5);
    expect(baseline.avgPerDay).toBeCloseTo((90 / 30 + 51 / 31) / 2);
    // October is at day 15
    expect(baseline.atDay).toBe(40);
    expect(baseline.categoryAtDay).toEqual(new Map([["food", 40]]));
  });
});

describe("previousMonth", () => {
  it("returns the latest earlier month, skipping trips", () => {
    const aug = period("aug", "2026-08-01", "2026-08-31");
    const sep = period("sep", "2026-09-01", "2026-09-30", { label: "Thuis" });
    const trip = period("trip", "2026-09-20", "2026-09-25", { kind: "trip", label: "Trip" });
    const oct = period("oct", "2026-10-01", "2026-10-31");
    expect(previousMonth(oct, [aug, trip, oct, sep])?.month.id).toBe("sep");
  });

  it("is null for the first month", () => {
    const aug = period("aug", "2026-08-01", "2026-08-31");
    const sep = period("sep", "2026-09-01", "2026-09-30");
    expect(previousMonth(aug, [aug, sep])).toBeNull();
  });
});

describe("labelSummaries", () => {
  it("groups by label (none = Other), newest label first, averaging finished periods only", () => {
    const all = [
      period("jun", "2026-06-01", "2026-06-30", { label: null, expenses: [expense("2026-06-01", 30)] }),
      period("aug", "2026-08-01", "2026-08-31", { label: "Thuis", expenses: [expense("2026-08-01", 62)] }),
      period("sep", "2026-09-01", "2026-09-30", { expenses: [expense("2026-09-01", 90)] }),
      period("oct", "2026-10-01", "2026-10-31", { expenses: [expense("2026-10-01", 500)] }),
    ];
    expect(labelSummaries(all, TODAY)).toEqual([
      { label: "Galway", count: 2, avgPerDay: 3, avgTotal: 90 },
      { label: "Thuis", count: 1, avgPerDay: 2, avgTotal: 62 },
      { label: "Other", count: 1, avgPerDay: 1, avgTotal: 30 },
    ]);
  });
});
