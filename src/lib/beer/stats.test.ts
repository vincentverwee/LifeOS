import { describe, it, expect } from "vitest";
import { between, monthStarts, pricesByMonth, pubStats, totals, type BeerVisit, type PubRow } from "@/lib/beer/stats";

let nextId = 0;
/** A beer at € 6 a pint; `counted` null = guessed. */
function visit(date: string, amount: number, counted: number | null, pubId: string | null = null): BeerVisit {
  return { id: `v${nextId++}`, date, amount, counted, pintPrice: 6, pubId, pubName: null, note: null };
}

function pub(id: string): PubRow {
  return { id, name: id, latitude: null, longitude: null, osmId: null };
}

describe("totals", () => {
  it("is empty when nothing counts", () => {
    expect(totals([])).toEqual({ pints: 0, liters: 0, spend: 0, pricePerPint: null, days: 0 });
  });

  it("skips cheap guessed beers (food)", () => {
    expect(totals([visit("2026-10-01", 4, null)])).toEqual({ pints: 0, liters: 0, spend: 0, pricePerPint: null, days: 0 });
  });

  it("adds guessed beers to pints and spend but not to the price per pint", () => {
    const t = totals([visit("2026-10-01", 12, null), visit("2026-10-01", 10, 2), visit("2026-10-03", 15, 3)]);
    expect(t.pints).toBe(7);
    expect(t.spend).toBe(37);
    expect(t.pricePerPint).toBe(5);
    expect(t.days).toBe(2);
  });

  it("has no price per pint with only guessed beers", () => {
    expect(totals([visit("2026-10-01", 12, null)]).pricePerPint).toBeNull();
  });
});

describe("pubStats", () => {
  it("counts distinct days as visits and keeps pubs without beers", () => {
    const rows = pubStats(
      [pub("empty"), pub("sult")],
      [visit("2026-10-01", 10, 2, "sult"), visit("2026-10-01", 5, 1, "sult"), visit("2026-10-05", 12, null, "sult")]
    );
    expect(rows.map((r) => r.id)).toEqual(["sult", "empty"]);
    expect(rows[0]).toMatchObject({
      visits: 2,
      pints: 5,
      spend: 27,
      pricePerPint: 5,
      firstVisit: "2026-10-01",
      lastVisit: "2026-10-05",
    });
    expect(rows[1]).toMatchObject({ visits: 0, pints: 0, spend: 0, pricePerPint: null, firstVisit: null, lastVisit: null });
  });

  it("ignores visits without a pub", () => {
    const [row] = pubStats([pub("a")], [visit("2026-10-01", 10, 2)]);
    expect(row.visits).toBe(0);
  });

  it("breaks ties on visits by the most recent visit", () => {
    const rows = pubStats(
      [pub("old"), pub("never"), pub("new")],
      [visit("2026-09-01", 6, 1, "old"), visit("2026-10-01", 6, 1, "new")]
    );
    expect(rows.map((r) => r.id)).toEqual(["new", "old", "never"]);
  });
});

describe("pricesByMonth", () => {
  it("uses counted beers only, oldest month first", () => {
    expect(
      pricesByMonth([
        visit("2026-10-03", 12, 2),
        visit("2026-09-10", 10, 2),
        visit("2026-10-20", 21, 3),
        visit("2026-08-01", 12, null),
      ])
    ).toEqual([
      { month: "2026-09", pricePerPint: 5, pints: 2 },
      { month: "2026-10", pricePerPint: 6.6, pints: 5 },
    ]);
  });
});

describe("free and smaller beers", () => {
  it("counts a free beer as pints but leaves the price per pint alone", () => {
    const t = totals([visit("2026-10-01", 12, 2), visit("2026-10-02", 0, 3)]);
    expect(t.pints).toBe(5);
    expect(t.spend).toBe(12);
    expect(t.pricePerPint).toBe(6);
    expect(pricesByMonth([visit("2026-10-02", 0, 3)])).toEqual([]);
  });

  it("totals litres by size, a pint being 568 ml", () => {
    const small: BeerVisit = { ...visit("2026-10-01", 9, 3), sizeMl: 330 };
    expect(totals([visit("2026-10-01", 12, 2), small]).liters).toBeCloseTo(2 * 0.568 + 3 * 0.33, 5);
  });
});

describe("monthStarts", () => {
  it("goes back a year in January", () => {
    expect(monthStarts("2026-01-15")).toEqual({
      thisMonth: "2026-01-01",
      lastMonth: "2025-12-01",
      lastMonthEnd: "2025-12-31",
    });
  });

  it("ends February on the right day in March", () => {
    expect(monthStarts("2026-03-31").lastMonthEnd).toBe("2026-02-28");
    expect(monthStarts("2024-03-01")).toEqual({
      thisMonth: "2024-03-01",
      lastMonth: "2024-02-01",
      lastMonthEnd: "2024-02-29",
    });
  });
});

describe("between", () => {
  it("includes both ends", () => {
    const visits = [visit("2026-09-30", 6, 1), visit("2026-10-01", 6, 1), visit("2026-10-31", 6, 1), visit("2026-11-01", 6, 1)];
    expect(between(visits, "2026-10-01", "2026-10-31").map((v) => v.date)).toEqual(["2026-10-01", "2026-10-31"]);
  });
});
