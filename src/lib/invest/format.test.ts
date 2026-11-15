import { describe, expect, it } from "vitest";
import { chartDay, formatDay, formatMonth, formatPct, formatSignedPct, parseUnitPrice, spansYear } from "./format";

describe("invest format", () => {
  it("reads unit prices with up to 4 decimals", () => {
    expect(parseUnitPrice("98,456")).toBe(98.456);
    expect(parseUnitPrice("135,4567")).toBe(135.4567);
    expect(parseUnitPrice(" 141.22 ")).toBe(141.22);
    expect(parseUnitPrice("1.234,5")).toBeNull();
    expect(parseUnitPrice("1,23456")).toBeNull();
    expect(parseUnitPrice("0")).toBeNull();
    expect(parseUnitPrice("")).toBeNull();
    expect(parseUnitPrice("5", 4)).toBeNull();
  });
  it("formats shares as percentages", () => {
    expect(formatPct(0.0451)).toBe("4,5%");
    expect(formatSignedPct(-0.0189)).toBe("−1,9%");
  });
  it("adds the year only when needed", () => {
    expect(formatDay("2026-11-13", "2026-11-15")).toBe("13 Nov");
    expect(formatDay("2025-11-13", "2026-11-15")).toBe("13 Nov 2025");
    expect(formatMonth("2023-10")).toBe("Oct 2023");
    expect(formatMonth("2023-10", "year")).toBe("Oct '23");
    expect(chartDay("2025-11-13", true)).toBe("Nov '25");
    expect(chartDay("2025-11-13", false)).toBe("13 Nov");
  });
  it("knows when a range spans a year", () => {
    expect(spansYear("2025-11-01", "2026-09-30")).toBe(false);
    expect(spansYear("2023-10", "2026-09")).toBe(true);
    expect(spansYear(undefined, "2026-09")).toBe(false);
  });
});
