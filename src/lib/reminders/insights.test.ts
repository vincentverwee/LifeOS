import { describe, expect, it } from "vitest";
import { calendarWeeks, countMonthToDate, routineStats, sameDayLastMonth } from "./insights";

describe("sameDayLastMonth", () => {
  it("clamps month ends and crosses the year", () => {
    expect(sameDayLastMonth("2026-03-31")).toBe("2026-02-28");
    expect(sameDayLastMonth("2028-03-31")).toBe("2028-02-29");
    expect(sameDayLastMonth("2027-01-15")).toBe("2026-12-15");
  });
});

describe("countMonthToDate", () => {
  it("counts only that month up to the day", () => {
    const logs = ["2026-01-31", "2026-02-01", "2026-02-10", "2026-02-20"];
    expect(countMonthToDate(logs, "2026-02-10")).toBe(2);
  });
});

describe("calendarWeeks", () => {
  it("ends on the week of today, Monday first, future days marked", () => {
    const weeks = calendarWeeks(["2026-11-17", "2026-11-17"], "2026-11-19"); // a Thursday
    const last = weeks.at(-1)!;
    expect(last[0].key).toBe("2026-11-16");
    expect(last[1]).toEqual({ key: "2026-11-17", count: 2, future: false });
    expect(last[4].future).toBe(true);
  });
});

describe("routineStats", () => {
  it("gaps, median and on-time share", () => {
    const s = routineStats({ id: "r", name: "x", everyDays: 7, doneOns: ["2026-11-01", "2026-11-05", "2026-11-15"] }, "2026-11-19");
    expect(s.typicalGap).toBe(7); // gaps 4 and 10
    expect(s.longestGap).toBe(10);
    expect(s.onTime).toBe(0.5);
    expect(s.last30).toBe(3);
  });
});
