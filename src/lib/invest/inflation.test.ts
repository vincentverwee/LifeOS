import { describe, expect, it } from "vitest";
import { budgetVsInflation, factor, indexFor, inTodaysEuros, keepUpSeries, parseHicp, realRate, realResult, yearOnYear, type CpiPoint } from "./inflation";
import type { Trade } from "./types";

const cpi: CpiPoint[] = [
  { month: "2025-01", index: 100 },
  { month: "2025-06", index: 102 },
  { month: "2026-01", index: 104 },
  { month: "2026-06", index: 105 },
];

const buy = (date: string, units: number, price: number): Trade => ({
  id: date, instrumentId: "a", date, type: "buy", units, price, amount: null, fees: 0, tax: 0, note: null,
});

describe("parseHicp", () => {
  it("reads the time positions from a JSON-stat reply", () => {
    const json = {
      id: ["freq", "unit", "coicop18", "geo", "time"],
      size: [1, 1, 1, 1, 3],
      value: { "0": 141.9, "2": 141.83, "1": null },
      dimension: { time: { category: { index: { "2026-08": 0, "2026-07": 1, "2026-09": 2 } } } },
    };
    expect(parseHicp(json)).toEqual([
      { month: "2026-08", index: 141.9 },
      { month: "2026-09", index: 141.83 },
    ]);
    expect(parseHicp({ error: "x" })).toBeNull();
  });
});

describe("indexFor / factor", () => {
  it("carries the newest index forward and falls back to the oldest", () => {
    expect(indexFor(cpi, "2025-03")).toBe(100);
    expect(indexFor(cpi, "2026-11")).toBe(105);
    expect(indexFor(cpi, "2024-01")).toBe(100);
    expect(indexFor([], "2026-01")).toBeNull();
  });
  it("turns old euros into today's", () => {
    expect(factor(cpi, "2025-01", "2026-06")).toBeCloseTo(1.05);
    expect(inTodaysEuros(100, "2025-06", cpi)).toBeCloseTo(102.94, 2);
  });
});

describe("yearOnYear", () => {
  it("compares with the same month a year earlier", () => {
    expect(yearOnYear(cpi).map((p) => [p.month, Number(p.pct.toFixed(4))])).toEqual([
      ["2026-01", 0.04],
      ["2026-06", 0.0294],
    ]);
  });
});

describe("keep up", () => {
  const trades = [buy("2025-01-10", 10, 100), buy("2026-01-10", 10, 100)];
  it("grows each deposit from its own month", () => {
    const series = [
      { date: "2025-01-10", value: 1000, deposited: 1000 },
      { date: "2026-06-01", value: 2200, deposited: 2000 },
    ];
    const out = keepUpSeries(trades, cpi, series);
    expect(out[0].keepUp).toBeCloseTo(1000);
    expect(out[1].keepUp).toBeCloseTo(1050 + 1000 * (105 / 104));
  });
  it("gives the real gain on today's value", () => {
    const r = realResult(trades, cpi, 2200);
    expect(r.keepUp).toBeCloseTo(2059.62, 2);
    expect(r.realGain).toBeCloseTo(140.38, 2);
  });
});

describe("realRate", () => {
  it("takes inflation off interest", () => {
    expect(realRate(0.025, 0.029)).toBeCloseTo(-0.00389, 5);
  });
});

describe("budgetVsInflation", () => {
  const months = [
    { start: "2025-01-01", label: "Thuis", budget: 500, spent: 400 },
    { start: "2025-06-18", label: "Galway", budget: 1500, spent: 850 },
    { start: "2026-01-18", label: "Galway", budget: 900, spent: 950 },
  ];
  it("says what the current budget buys in the first month's prices", () => {
    const { rows, power } = budgetVsInflation(months, cpi, { budget: 1000, label: "Galway" });
    expect(rows[0].start).toBe("2026-01-18");
    expect(power!.since).toBe("2025-06");
    expect(power!.rise).toBeCloseTo(105 / 102 - 1);
    expect(power!.buys).toBeCloseTo(1000 / (105 / 102));
  });
  it("stays quiet while prices haven't moved", () => {
    const flat = [{ month: "2025-01", index: 100 }];
    expect(budgetVsInflation(months, flat, { budget: 1000, label: "Galway" }).power).toBeNull();
  });
});
