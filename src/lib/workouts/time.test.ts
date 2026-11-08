import { describe, it, expect } from "vitest";
import { parseTime, partOfDay, timeOfDayIn, zonedInstant } from "./time";

describe("zoned time", () => {
  it("turns Brussels wall time into the right instant, summer and winter", () => {
    expect(zonedInstant("2026-07-01", "18:30", "Europe/Brussels").toISOString()).toBe("2026-07-01T16:30:00.000Z");
    expect(zonedInstant("2026-11-08", "07:05", "Europe/Brussels").toISOString()).toBe("2026-11-08T06:05:00.000Z");
    expect(zonedInstant("2026-11-08", "07:05", "Europe/Dublin").toISOString()).toBe("2026-11-08T07:05:00.000Z");
  });
  it("round-trips through timeOfDayIn", () => {
    const at = zonedInstant("2026-03-29", "10:15", "Europe/Brussels"); // DST day
    expect(timeOfDayIn(at, "Europe/Brussels")).toBe("10:15");
  });
  it("parses HH:MM and names the part of the day", () => {
    expect(parseTime("7:05")).toBe("07:05");
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("ab")).toBeNull();
    expect(partOfDay("07:05")).toBe("Morning");
    expect(partOfDay("19:00")).toBe("Evening");
  });
});
