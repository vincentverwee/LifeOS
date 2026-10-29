import { describe, expect, it } from "vitest";
import {
  anchorsFrom,
  describeSchedule,
  isDue,
  monthlyCost,
  renewalAfter,
  renewalOnOrAfter,
  yearlyCost,
} from "./schedule";

const TODAY = "2026-10-29";
const leapYearly = { repeat: "yearly" as const, anchorDay: 29, anchorMonth: 2 };
const monthly31 = { repeat: "monthly" as const, anchorDay: 31, anchorMonth: null };
const monthly15 = { repeat: "monthly" as const, anchorDay: 15, anchorMonth: null };

describe("renewalAfter", () => {
  it("keeps a 29 Feb anchor across non-leap years", () => {
    expect(renewalAfter(leapYearly, "2024-02-29")).toBe("2025-02-28");
    expect(renewalAfter(leapYearly, "2025-02-28")).toBe("2026-02-28");
    expect(renewalAfter(leapYearly, "2027-02-28")).toBe("2028-02-29");
  });

  it("clamps a monthly 31 anchor and returns to 31", () => {
    expect(renewalAfter(monthly31, "2026-10-31")).toBe("2026-11-30");
    expect(renewalAfter(monthly31, "2026-11-30")).toBe("2026-12-31");
    expect(renewalAfter(monthly31, "2027-01-31")).toBe("2027-02-28");
  });
});

describe("anchorsFrom", () => {
  it("takes the day, and the month only for yearly", () => {
    expect(anchorsFrom("2026-03-14", "monthly")).toEqual({ anchorDay: 14, anchorMonth: null });
    expect(anchorsFrom("2028-02-29", "yearly")).toEqual({ anchorDay: 29, anchorMonth: 2 });
  });
});

describe("renewalOnOrAfter", () => {
  it("returns from when it's today or later", () => {
    expect(renewalOnOrAfter(monthly15, "2026-11-15", TODAY)).toBe("2026-11-15");
    expect(renewalOnOrAfter(monthly15, TODAY, TODAY)).toBe(TODAY);
  });

  it("steps past renewals until reaching today (today itself counts)", () => {
    expect(renewalOnOrAfter(monthly15, "2026-08-15", TODAY)).toBe("2026-11-15");
    expect(renewalOnOrAfter(monthly15, "2026-08-15", "2026-10-15")).toBe("2026-10-15");
    expect(renewalOnOrAfter(leapYearly, "2024-02-29", TODAY)).toBe("2027-02-28");
  });
});

describe("isDue", () => {
  it("is due from nextDueOn on, only while active", () => {
    expect(isDue({ isActive: true, nextDueOn: TODAY }, TODAY)).toBe(true);
    expect(isDue({ isActive: true, nextDueOn: "2026-10-01" }, TODAY)).toBe(true);
    expect(isDue({ isActive: true, nextDueOn: "2026-10-30" }, TODAY)).toBe(false);
    expect(isDue({ isActive: false, nextDueOn: "2026-10-01" }, TODAY)).toBe(false);
  });
});

describe("monthlyCost / yearlyCost", () => {
  it("converts between monthly and yearly", () => {
    expect(monthlyCost({ amount: 120, repeat: "yearly" })).toBe(10);
    expect(monthlyCost({ amount: 9.99, repeat: "monthly" })).toBe(9.99);
    expect(yearlyCost({ amount: 120, repeat: "yearly" })).toBe(120);
    expect(yearlyCost({ amount: 10, repeat: "monthly" })).toBe(120);
  });
});

describe("describeSchedule", () => {
  it("renders monthly and yearly schedules, including 29 Feb", () => {
    expect(describeSchedule(monthly31)).toBe("Monthly on the 31st");
    expect(describeSchedule({ repeat: "yearly", anchorDay: 3, anchorMonth: 3 })).toBe("Yearly on 3 Mar");
    expect(describeSchedule(leapYearly)).toBe("Yearly on 29 Feb");
  });
});
