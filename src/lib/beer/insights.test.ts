import { describe, it, expect } from "vitest";
import { earlierPintMonths } from "@/lib/beer/insights";
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
