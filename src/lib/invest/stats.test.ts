import { describe, expect, it } from "vitest";
import { allocation, depositsByMonth, firstOversell, growthBetween, positions, suggestedTob, totals, valueSeries, yearResult } from "./stats";
import type { Fund, Trade } from "./types";

const fund = (id: string, targetPct: number | null = null): Fund => ({
  id,
  ticker: id.toUpperCase(),
  isin: null,
  name: id,
  currency: "EUR",
  color: "blue",
  targetPct,
  tobRate: 0.0012,
  isArchived: false,
  pricesFetchedAt: null,
});

let n = 0;
const buy = (instrumentId: string, date: string, units: number, price: number, fees = 0, tax = 0): Trade => ({
  id: `t${n++}`, instrumentId, date, type: "buy", units, price, amount: null, fees, tax, note: null,
});
const sell = (instrumentId: string, date: string, units: number, price: number, fees = 0, tax = 0): Trade => ({
  ...buy(instrumentId, date, units, price, fees, tax), type: "sell",
});
const dividend = (instrumentId: string, date: string, amount: number, tax = 0): Trade => ({
  id: `t${n++}`, instrumentId, date, type: "dividend", units: null, price: null, amount, fees: 0, tax, note: null,
});

describe("positions", () => {
  it("averages cost with fees and tax and values at the newest close", () => {
    const trades = [buy("a", "2026-11-16", 10, 100, 2, 1.2), buy("a", "2026-12-16", 10, 110, 2, 1.32)];
    const [p] = positions([fund("a")], trades, { a: [{ date: "2026-12-17", close: 120 }, { date: "2026-12-18", close: 121 }] });
    expect(p.units).toBe(20);
    expect(p.cost).toBeCloseTo(2106.52);
    expect(p.value).toBeCloseTo(2420);
    expect(p.gain).toBeCloseTo(313.48);
    expect(p.dayChange).toBeCloseTo(20);
    expect(p.priceDate).toBe("2026-12-18");
  });

  it("falls back to the last trade's price when no close is stored", () => {
    const [p] = positions([fund("a")], [buy("a", "2026-11-16", 4, 50)], {});
    expect(p.value).toBe(200);
    expect(p.priceDate).toBeNull();
  });

  it("realises gains on a sell at average cost", () => {
    const trades = [buy("a", "2026-01-05", 10, 100), buy("a", "2026-02-05", 10, 200), sell("a", "2026-03-05", 5, 300, 3)];
    const [p] = positions([fund("a")], trades, {});
    expect(p.units).toBe(15);
    expect(p.cost).toBeCloseTo(2250);
    expect(p.realised).toBeCloseTo(5 * 300 - 3 - 5 * 150);
  });

  it("totals net money in, including dividends back out", () => {
    const trades = [buy("a", "2026-01-05", 10, 100, 1), dividend("a", "2026-06-01", 20, 6)];
    const list = positions([fund("a")], trades, {});
    const t = totals(list, trades);
    expect(t.netDeposited).toBeCloseTo(1001 - 14);
    expect(t.dividends).toBeCloseTo(14);
  });
});

describe("firstOversell", () => {
  it("finds a sell bigger than what was held then", () => {
    const early = sell("a", "2026-01-01", 1, 10);
    expect(firstOversell([buy("a", "2026-01-02", 5, 10), early])).toBe(early);
  });
  it("allows a buy and sell on the same day", () => {
    expect(firstOversell([sell("a", "2026-01-02", 5, 10), buy("a", "2026-01-02", 5, 10)])).toBeNull();
  });
});

describe("allocation", () => {
  it("shares the value and compares with targets", () => {
    const trades = [buy("a", "2026-01-01", 3, 100), buy("b", "2026-01-01", 1, 100)];
    const slices = allocation(positions([fund("a", 80), fund("b", 20)], trades, {}));
    expect(slices.map((s) => s.share)).toEqual([75, 25]);
    expect(slices[0].diff).toBe(-5);
  });
});

describe("valueSeries", () => {
  it("carries closes over weekends and tracks money put in", () => {
    const trades = [buy("a", "2026-11-13", 10, 100)];
    const series = valueSeries(trades, { a: [{ date: "2026-11-13", close: 100 }, { date: "2026-11-16", close: 105 }] }, "2026-11-16");
    expect(series.map((p) => p.value)).toEqual([1000, 1000, 1000, 1050]);
    expect(series.every((p) => p.deposited === 1000)).toBe(true);
    expect(growthBetween(series[0], series[3])).toBe(50);
  });
  it("thins long series and keeps the last day", () => {
    const series = valueSeries([buy("a", "2020-01-01", 1, 10)], {}, "2026-01-01", { maxPoints: 100 });
    expect(series.length).toBeLessThanOrEqual(101);
    expect(series.at(-1)!.date).toBe("2026-01-01");
  });
});

describe("depositsByMonth / yearResult / suggestedTob", () => {
  it("groups money in per month", () => {
    const trades = [buy("a", "2026-11-16", 1, 100, 2), buy("a", "2026-11-20", 1, 100), sell("a", "2026-12-01", 1, 150)];
    expect(depositsByMonth(trades)).toEqual([{ month: "2026-11", net: 202 }, { month: "2026-12", net: -150 }]);
  });
  it("counts only the year's sells and dividends", () => {
    const trades = [buy("a", "2025-01-01", 2, 100), sell("a", "2025-06-01", 1, 150), sell("a", "2026-06-01", 1, 200), dividend("a", "2026-07-01", 10, 3)];
    expect(yearResult(trades, 2026)).toEqual({ realised: 100, dividends: 7 });
  });
  it("rounds the TOB to cents", () => {
    expect(suggestedTob(3, 133.37, 0.0012)).toBe(0.48);
  });
});
