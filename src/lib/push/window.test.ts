import { describe, expect, it } from "vitest";
import { weekdayOf } from "@/lib/reminders/schedule";
import { isKindDueNow, minuteIn, rentDateIn, WINDOW_HOURS, weekBudget } from "./window";

const THURSDAY = "2026-10-29";
const SATURDAY = "2026-10-31";
const SUNDAY = "2026-11-01";
const at = (h: number, m = 0) => h * 60 + m;

describe("isKindDueNow", () => {
  it("uses real Saturday/Sunday keys", () => {
    expect(weekdayOf(SATURDAY)).toBe(6);
    expect(weekdayOf(SUNDAY)).toBe(0);
  });

  it("opens at the default time (inclusive) and closes after WINDOW_HOURS (exclusive)", () => {
    expect(WINDOW_HOURS.digest).toBe(3);
    expect(isKindDueNow("digest", at(7, 59), {}, THURSDAY)).toBe(false);
    expect(isKindDueNow("digest", at(8), {}, THURSDAY)).toBe(true);
    expect(isKindDueNow("digest", at(10, 59), {}, THURSDAY)).toBe(true);
    expect(isKindDueNow("digest", at(11), {}, THURSDAY)).toBe(false);
  });

  it("clamps the window at midnight", () => {
    const times = { digest: "23:00" };
    expect(isKindDueNow("digest", at(23), times, THURSDAY)).toBe(true);
    expect(isKindDueNow("digest", at(23, 59), times, THURSDAY)).toBe(true);
    expect(isKindDueNow("digest", at(0, 30), times, THURSDAY)).toBe(false);
    expect(isKindDueNow("digest", at(1, 59), times, THURSDAY)).toBe(false);
  });

  it("lets a custom time beat the default, per kind", () => {
    const times = { digest: "06:30" };
    expect(isKindDueNow("digest", at(6, 30), times, THURSDAY)).toBe(true);
    expect(isKindDueNow("digest", at(9, 30), times, THURSDAY)).toBe(false);
    expect(isKindDueNow("budget-evening", at(21), times, THURSDAY)).toBe(true);
  });

  it("sends the week review only on Sundays, within its 4-hour window", () => {
    expect(WINDOW_HOURS.week).toBe(4);
    expect(isKindDueNow("week", at(19), {}, SUNDAY)).toBe(true);
    expect(isKindDueNow("week", at(22, 59), {}, SUNDAY)).toBe(true);
    expect(isKindDueNow("week", at(23), {}, SUNDAY)).toBe(false);
    expect(isKindDueNow("week", at(19), {}, SATURDAY)).toBe(false);
    expect(isKindDueNow("week", at(19), {}, THURSDAY)).toBe(false);
  });
});

describe("minuteIn", () => {
  it("gives local minutes in summer and winter", () => {
    const summer = new Date("2026-07-01T12:00:00Z");
    expect(minuteIn("Europe/Brussels", summer)).toBe(at(14));
    expect(minuteIn("UTC", summer)).toBe(at(12));
    expect(minuteIn("Europe/Brussels", new Date("2026-12-01T12:15:00Z"))).toBe(at(13, 15));
  });

  it("handles the October DST change", () => {
    // 25 Oct 2026: 03:00 CEST becomes 02:00 CET at 01:00 UTC.
    expect(minuteIn("Europe/Brussels", new Date("2026-10-25T00:30:00Z"))).toBe(at(2, 30));
    expect(minuteIn("Europe/Brussels", new Date("2026-10-25T01:30:00Z"))).toBe(at(2, 30));
    expect(minuteIn("Europe/Brussels", new Date("2026-10-25T02:30:00Z"))).toBe(at(3, 30));
  });

  it("is 0 at local midnight, not 24:00", () => {
    expect(minuteIn("Europe/Brussels", new Date("2026-10-28T23:00:00Z"))).toBe(0);
  });
});

describe("rentDateIn", () => {
  it("puts the rent day in the key's month, clamping to its last day", () => {
    expect(rentDateIn("2026-10-12", 5)).toBe("2026-10-05");
    expect(rentDateIn("2026-10-12", 31)).toBe("2026-10-31");
    expect(rentDateIn("2026-11-12", 31)).toBe("2026-11-30");
    expect(rentDateIn("2026-02-12", 31)).toBe("2026-02-28");
    expect(rentDateIn("2028-02-12", 30)).toBe("2028-02-29");
  });
});

describe("weekBudget", () => {
  const MONDAY = "2026-10-26";
  const october = { budget: 310, start: "2026-10-01", end: "2026-10-31" }; // 10 a day
  const november = { budget: 300, start: "2026-11-01", end: "2026-11-30" }; // 10 a day

  it("prorates each range's budget over its length", () => {
    expect(weekBudget(MONDAY, [october, november])).toBeCloseTo(70);
  });

  it("adds nothing for days outside every range", () => {
    expect(weekBudget(MONDAY, [october])).toBeCloseTo(60);
    expect(weekBudget(MONDAY, [])).toBe(0);
  });

  it("lets a range listed first (a trip) win overlapping days", () => {
    const trip = { budget: 100, start: "2026-10-28", end: "2026-10-29" }; // 50 a day
    expect(weekBudget(MONDAY, [trip, october, november])).toBeCloseTo(5 * 10 + 100);
    expect(weekBudget(MONDAY, [october, november, trip])).toBeCloseTo(70);
  });
});
