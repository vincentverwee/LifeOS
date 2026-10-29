import { describe, expect, it } from "vitest";
import { dayKeyIn } from "./timeZone";

describe("dayKeyIn", () => {
  it("switches day at Brussels midnight, not UTC midnight", () => {
    const before = new Date("2026-10-28T22:59:00Z"); // 23:59 CET
    const after = new Date("2026-10-28T23:00:00Z"); // 00:00 CET
    expect(dayKeyIn("Europe/Brussels", before)).toBe("2026-10-28");
    expect(dayKeyIn("Europe/Brussels", after)).toBe("2026-10-29");
    expect(dayKeyIn("UTC", after)).toBe("2026-10-28");
  });

  it("uses the right offset on either side of the October DST change", () => {
    // Still CEST (+2) on the night of 24 to 25 Oct, CET (+1) the next night.
    expect(dayKeyIn("Europe/Brussels", new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
    expect(dayKeyIn("UTC", new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-24");
    expect(dayKeyIn("Europe/Brussels", new Date("2026-10-25T22:30:00Z"))).toBe("2026-10-25");
    expect(dayKeyIn("Europe/Brussels", new Date("2026-10-25T23:00:00Z"))).toBe("2026-10-26");
  });

  it("gives the previous day in an American timezone", () => {
    const instant = new Date("2026-10-29T02:00:00Z");
    expect(dayKeyIn("America/New_York", instant)).toBe("2026-10-28");
    expect(dayKeyIn("Europe/Brussels", instant)).toBe("2026-10-29");
  });
});
