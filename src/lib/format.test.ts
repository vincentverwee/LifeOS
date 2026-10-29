import { describe, it, expect } from "vitest";
import {
  MAX_AMOUNT,
  dayKey,
  evaluateAmount,
  formatCurrency,
  parseAmount,
  parseDateKey,
  parseHours,
  parseSignedAmount,
} from "@/lib/format";

describe("evaluateAmount / parseAmount", () => {
  it("does × and ÷ before + and −", () => {
    expect(parseAmount("2+3×4")).toBe(14);
    expect(parseAmount("10-6÷2")).toBe(7);
  });

  it("reads comma decimals", () => {
    expect(parseAmount("6,8+7,4")).toBe(14.2);
  });

  it("adds in cents so 0,1 + 0,2 is exactly 0,3", () => {
    expect(parseAmount("0,1+0,2")).toBe(0.3);
  });

  it("ignores one trailing operator", () => {
    expect(parseAmount("12+")).toBe(12);
    expect(parseAmount("12×")).toBe(12);
  });

  it("accepts x, X and * as multiply", () => {
    expect(parseAmount("12,50x3")).toBe(37.5);
    expect(parseAmount("12,50X3")).toBe(37.5);
    expect(parseAmount("12,50*3")).toBe(37.5);
  });

  it("ignores spaces", () => {
    expect(parseAmount(" 6,8 + 7,4 ")).toBe(14.2);
  });

  it("rejects division by zero", () => {
    expect(evaluateAmount("5/0")).toBeNull();
  });

  it("rejects more than two decimals (a thousands separator)", () => {
    expect(parseAmount("1.234")).toBeNull();
    expect(parseAmount("1,234")).toBeNull();
  });

  it("rejects empty and junk input", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("+")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("5++3")).toBeNull();
  });

  it("rejects negatives, which parseSignedAmount allows", () => {
    expect(evaluateAmount("-5")).toBe(-5);
    expect(parseAmount("-5")).toBeNull();
    expect(parseSignedAmount("-5")).toBe(-5);
    expect(parseSignedAmount("−5+2")).toBe(-3);
  });

  it("caps at MAX_AMOUNT", () => {
    expect(parseAmount(String(MAX_AMOUNT))).toBe(MAX_AMOUNT);
    expect(parseAmount(String(MAX_AMOUNT + 1))).toBeNull();
    expect(parseSignedAmount(`-${MAX_AMOUNT + 1}`)).toBeNull();
  });
});

describe("parseDateKey", () => {
  it("accepts real dates, including a leap day", () => {
    expect(parseDateKey("2026-10-29")).toBe("2026-10-29");
    expect(parseDateKey("2024-02-29")).toBe("2024-02-29");
  });

  it("rejects dates that would roll over", () => {
    expect(parseDateKey("2026-02-31")).toBeNull();
    expect(parseDateKey("2025-02-29")).toBeNull();
  });

  it("rejects other shapes and non-strings", () => {
    expect(parseDateKey("2026-1-5")).toBeNull();
    expect(parseDateKey("29/10/2026")).toBeNull();
    expect(parseDateKey(20261029)).toBeNull();
    expect(parseDateKey(null)).toBeNull();
  });
});

describe("parseHours", () => {
  it.each([
    ["1,5", 1.5],
    ["1:30", 1.5],
    ["90m", 1.5],
    ["45min", 0.75],
    ["1h30", 1.5],
    ["1u30", 1.5],
    ["2h", 2],
    ["1,5+2", 3.5],
    ["1:30 + 30m", 2],
  ])("%s → %d h", (raw, hours) => {
    expect(parseHours(raw)).toBe(hours);
  });

  it("rounds to two decimals", () => {
    expect(parseHours("20m")).toBe(0.33);
  });

  it("rejects junk", () => {
    expect(parseHours("")).toBeNull();
    expect(parseHours("abc")).toBeNull();
    expect(parseHours("1+")).toBeNull();
  });
});

describe("dayKey", () => {
  it("cuts a date-only string", () => {
    expect(dayKey("2026-10-29")).toBe("2026-10-29");
    expect(dayKey("2026-10-29T00:00:00.000Z")).toBe("2026-10-29");
  });

  it("reads a database Date (UTC midnight)", () => {
    expect(dayKey(new Date(Date.UTC(2026, 9, 29)))).toBe("2026-10-29");
  });

  // By design dayKey reads the UTC day, so a *local* midnight in Brussels
  // (UTC+1/+2) is the previous UTC day. Every caller passes @db.Date values
  // (UTC midnight); use toDateInputValue() for local Dates.
  it("gives the UTC day for a local-midnight Date", () => {
    expect(dayKey(new Date(2026, 9, 29))).toBe("2026-10-28");
  });
});

describe("formatCurrency", () => {
  it("formats euros the Belgian way", () => {
    expect(formatCurrency(1234.5)).toMatch(/^€\s1\.234,50$/);
  });
});
