import { describe, expect, it } from "vitest";
import { academicYearStart, formatMinutes, minutesBetween, trackedByKey, trackedTotals, trackedWeeks, weekStart } from "./tracked";

describe("academicYearStart", () => {
  it("starts on 1 September", () => {
    expect(academicYearStart("2026-11-04")).toBe("2026-09-01");
    expect(academicYearStart("2026-09-01")).toBe("2026-09-01");
    expect(academicYearStart("2026-08-31")).toBe("2025-09-01");
    expect(academicYearStart("2027-01-15")).toBe("2026-09-01");
  });
});

describe("weekStart", () => {
  it("goes back to Monday", () => {
    expect(weekStart("2026-11-04")).toBe("2026-11-02"); // Wednesday
    expect(weekStart("2026-11-02")).toBe("2026-11-02"); // Monday
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // Sunday
  });
});

const entries = [
  { date: "2026-11-03", minutes: 90, key: "Ekonomika" },
  { date: "2026-11-01", minutes: 60, key: "Projectvak" }, // Sunday of last week
  { date: "2026-10-20", minutes: 30, key: "Ekonomika" },
  { date: "2026-08-30", minutes: 120, key: "Ekonomika" }, // last academic year
];

describe("trackedTotals", () => {
  it("sums this week, this month and since 1 September", () => {
    expect(trackedTotals(entries, "2026-11-04")).toEqual({ week: 90, month: 150, year: 180 });
  });
});

describe("trackedWeeks", () => {
  it("buckets per Monday week, oldest first, per key", () => {
    const weeks = trackedWeeks(entries, "2026-11-04", 3);
    expect(weeks.map((w) => w.start)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(weeks.map((w) => w.total)).toEqual([30, 60, 90]);
    expect(weeks[0].byKey).toEqual({ Ekonomika: 30 });
    expect(weeks[2].byKey).toEqual({ Ekonomika: 90 });
  });
});

describe("trackedByKey", () => {
  it("adds up per key in the range, largest first", () => {
    expect(trackedByKey(entries, "2026-09-01", "2026-11-04")).toEqual([
      { key: "Ekonomika", minutes: 120 },
      { key: "Projectvak", minutes: 60 },
    ]);
  });
});

describe("formatMinutes / minutesBetween", () => {
  it("formats and measures", () => {
    expect(formatMinutes(200)).toBe("3 h 20");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(45)).toBe("45 min");
    expect(minutesBetween("14:00", "15:30")).toBe(90);
    expect(minutesBetween("23:30", "00:15")).toBe(45);
    expect(minutesBetween("10:00", "10:00")).toBeNull();
    expect(minutesBetween("25:00", "10:00")).toBeNull();
  });
});
