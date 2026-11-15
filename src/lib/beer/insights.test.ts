import { describe, it, expect } from "vitest";
import { beerRhythm, earlierPintMonths } from "@/lib/beer/insights";
import type { BeerVisit } from "@/lib/beer/stats";

let nextId = 0;
function visit(date: string, counted: number): BeerVisit {
  return { id: `v${nextId++}`, date, amount: counted * 6, counted, pintPrice: 6, pubId: null, pubName: null, note: null };
}

describe("earlierPintMonths", () => {
  it("is empty without beers", () => {
    expect(earlierPintMonths([], "2026-10")).toEqual([]);
  });

  it("takes the last n months from the first beer's month on, oldest first, dry ones included", () => {
    const visits = [visit("2026-07-03", 2), visit("2026-09-30", 1)];
    const months = earlierPintMonths(visits, "2026-11");
    expect(months.map((m) => m.month)).toEqual(["2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(months[0].run[1]).toBe(0);
    expect(months[0].run[2]).toBe(2);
    expect(months[1].run.at(-1)).toBe(0);
    expect(months[2].run).toHaveLength(30);
    expect(months[2].run[29]).toBe(1);
  });

  it("caps at n and crosses the year", () => {
    const visits = [visit("2025-01-10", 1)];
    expect(earlierPintMonths(visits, "2026-02", 3).map((m) => m.month)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});

describe("beerRhythm", () => {
  it("needs two nights out", () => {
    expect(beerRhythm([], "2026-11-15")).toBeNull();
    expect(beerRhythm([visit("2026-11-01", 2), visit("2026-11-01", 1)], "2026-11-15")).toBeNull();
  });

  it("averages the gaps, finds the longest break and run, and spots a change lately", () => {
    // Every 10 days, then 3 nights in a row, then every other day.
    const dates = ["2026-08-01", "2026-08-11", "2026-08-21", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-04", "2026-09-06", "2026-09-08"];
    const r = beerRhythm(dates.map((d) => visit(d, 1)), "2026-09-10")!;
    expect(r.nights).toBe(9);
    expect(r.usual).toBe(5); // 38 days / 8 gaps
    expect(r.lately).toBe(2); // last 6 nights: 31 Aug → 8 Sep = 8 days / 5
    expect(r.trend).toBe("more");
    expect(r.since).toBe(2);
    expect(r.longestBreak).toEqual({ days: 10, from: "2026-08-01", to: "2026-08-11" });
    expect(r.longestRun).toEqual({ nights: 3, from: "2026-08-31" });
  });

  it("ignores food (no pints), days after asOf and anything older than a year", () => {
    const visits = [visit("2025-01-01", 1), visit("2026-09-01", 1), visit("2026-09-05", 0), visit("2026-09-05", 1), visit("2026-09-20", 1)];
    const r = beerRhythm(visits, "2026-09-10")!;
    expect(r.nights).toBe(2);
    expect(r.usual).toBe(4);
    expect(r.trend).toBeNull();
  });
});
