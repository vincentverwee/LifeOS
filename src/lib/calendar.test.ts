import { describe, expect, it } from "vitest";
import { calendarWeeks } from "./calendar";

describe("calendarWeeks", () => {
  it("pads a Sunday start and a Monday end to whole Monday-first weeks", () => {
    // 2026-11-01 is a Sunday, 2026-11-09 a Monday.
    const weeks = calendarWeeks("2026-11-01", "2026-11-09");
    expect(weeks).toHaveLength(3);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0]).toEqual({ key: "2026-10-26", inRange: false });
    expect(weeks[0][6]).toEqual({ key: "2026-11-01", inRange: true });
    expect(weeks[2][0]).toEqual({ key: "2026-11-09", inRange: true });
    expect(weeks[2][6]).toEqual({ key: "2026-11-15", inRange: false });
  });
});
