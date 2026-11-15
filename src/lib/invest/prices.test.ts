import { describe, expect, it } from "vitest";
import { isIsin, normalizeTicker, parseEodhd, parseYahooChart, toEodhdTicker } from "./prices";

describe("parseYahooChart", () => {
  it("shifts bars to the exchange's day and skips gaps", () => {
    const json = {
      chart: {
        result: [
          {
            meta: { currency: "EUR", gmtoffset: 3600, longName: "Vanguard FTSE All-World" },
            // 2026-11-13 08:00 and 2026-11-16 08:00 UTC, plus a null bar.
            timestamp: [1794556800, 1794643200, 1794816000],
            indicators: { quote: [{ close: [140.123456, null, 141.5] }] },
          },
        ],
      },
    };
    const parsed = parseYahooChart(json)!;
    expect(parsed.currency).toBe("EUR");
    expect(parsed.name).toBe("Vanguard FTSE All-World");
    expect(parsed.prices).toEqual([
      { date: "2026-11-13", close: 140.1235 },
      { date: "2026-11-16", close: 141.5 },
    ]);
  });
  it("returns null on an error reply", () => {
    expect(parseYahooChart({ chart: { result: null, error: { code: "Not Found" } } })).toBeNull();
  });
});

describe("parseEodhd", () => {
  it("keeps valid rows, oldest first", () => {
    expect(parseEodhd([{ date: "2026-11-16", close: 2 }, { date: "bad", close: 1 }, { date: "2026-11-13", close: 1 }])).toEqual([
      { date: "2026-11-13", close: 1 },
      { date: "2026-11-16", close: 2 },
    ]);
    expect(parseEodhd({ error: "x" })).toBeNull();
  });
});

describe("tickers", () => {
  it("maps Yahoo suffixes to EODHD exchanges", () => {
    expect(toEodhdTicker("VWCE.DE")).toBe("VWCE.XETRA");
    expect(toEodhdTicker("IWDA.AS")).toBe("IWDA.AS");
    expect(toEodhdTicker("VOO")).toBe("VOO.US");
    expect(toEodhdTicker("X.ZZ")).toBeNull();
  });
  it("normalises and validates", () => {
    expect(normalizeTicker(" vwce.de ")).toBe("VWCE.DE");
    expect(normalizeTicker("not a ticker")).toBeNull();
    expect(isIsin("IE00BK5BQT80")).toBe(true);
    expect(isIsin("IE00BK5BQT8")).toBe(false);
  });
});
