import { describe, expect, it } from "vitest";
import {
  describeDue,
  describeRepeat,
  firstDueOn,
  isOpen,
  nextDueAfter,
  nextMonth,
  ordinal,
  weekdayOf,
} from "./schedule";

const TODAY = "2026-10-29"; // a Thursday

const weekly = (weekdays: number[]) => ({ repeat: "weekly" as const, anchorDay: null, weekdays });

describe("nextMonth", () => {
  it("clamps a 31 anchor to February and comes back to 31 in March", () => {
    expect(nextMonth("2026-01-31", 31)).toBe("2026-02-28");
    expect(nextMonth("2026-02-28", 31)).toBe("2026-03-31");
    expect(nextMonth("2028-01-31", 31)).toBe("2028-02-29");
  });

  it("clamps 31 to 30 November", () => {
    expect(nextMonth("2026-10-31", 31)).toBe("2026-11-30");
  });

  it("rolls December over into January of the next year", () => {
    expect(nextMonth("2026-12-15", 15)).toBe("2027-01-15");
  });
});

describe("nextDueAfter", () => {
  it("skips missed months and always lands after today", () => {
    const monthly = { repeat: "monthly" as const, anchorDay: 15, weekdays: [] };
    expect(nextDueAfter(monthly, "2026-07-15", TODAY)).toBe("2026-11-15");
    expect(nextDueAfter(monthly, "2026-10-15", "2026-10-15")).toBe("2026-11-15");
  });

  it("uses dueOn's day when a monthly reminder has no anchorDay", () => {
    const monthly = { repeat: "monthly" as const, anchorDay: null, weekdays: [] };
    expect(nextDueAfter(monthly, "2026-01-31", "2026-02-10")).toBe("2026-02-28");
    expect(nextDueAfter(monthly, "2026-10-03", TODAY)).toBe("2026-11-03");
  });

  it("counts daily ones from the later of dueOn and today", () => {
    const daily = { repeat: "daily" as const, anchorDay: null, weekdays: [] };
    expect(nextDueAfter(daily, "2026-10-20", TODAY)).toBe("2026-10-30");
    expect(nextDueAfter(daily, "2026-11-05", TODAY)).toBe("2026-11-06");
  });

  it("moves weekly ones to the next chosen weekday after the later of dueOn and today", () => {
    expect(nextDueAfter(weekly([1]), "2026-10-26", TODAY)).toBe("2026-11-02");
    expect(nextDueAfter(weekly([4]), TODAY, TODAY)).toBe("2026-11-05");
    expect(nextDueAfter(weekly([1]), "2026-11-09", TODAY)).toBe("2026-11-16");
  });

  it("uses dueOn's weekday when no weekdays are stored", () => {
    expect(weekdayOf("2026-10-27")).toBe(2);
    expect(nextDueAfter(weekly([]), "2026-10-27", TODAY)).toBe("2026-11-03");
  });

  it("ignores out-of-range weekdays instead of looping forever", () => {
    expect(nextDueAfter(weekly([7]), "2026-10-27", TODAY)).toBe("2026-11-03");
    expect(nextDueAfter(weekly([-1]), "2026-10-27", TODAY)).toBe("2026-11-03");
    expect(nextDueAfter(weekly([7, 5]), "2026-10-27", TODAY)).toBe("2026-10-30");
  });
});

describe("firstDueOn", () => {
  it("moves weekly ones to the first chosen day on or after start", () => {
    expect(firstDueOn("weekly", TODAY, [3, 5])).toBe("2026-10-30");
    expect(firstDueOn("weekly", TODAY, [4])).toBe(TODAY);
    expect(firstDueOn("weekly", TODAY, [])).toBe(TODAY);
  });

  it("falls back to start's weekday for out-of-range days", () => {
    expect(firstDueOn("weekly", TODAY, [7])).toBe(TODAY);
    expect(firstDueOn("weekly", TODAY, [-1])).toBe(TODAY);
  });

  it("leaves other repeats on start", () => {
    expect(firstDueOn("monthly", TODAY, [1])).toBe(TODAY);
    expect(firstDueOn("once", TODAY, [])).toBe(TODAY);
  });
});

describe("describeRepeat", () => {
  it("describes each kind", () => {
    expect(describeRepeat({ repeat: "once", anchorDay: null, weekdays: [] }, TODAY)).toBeNull();
    expect(describeRepeat({ repeat: "daily", anchorDay: null, weekdays: [] }, null)).toBeNull();
    expect(describeRepeat({ repeat: "daily", anchorDay: null, weekdays: [] }, TODAY)).toBe("Every day");
    expect(describeRepeat({ repeat: "monthly", anchorDay: null, weekdays: [] }, "2026-10-03")).toBe("Every month on the 3rd");
    expect(describeRepeat({ repeat: "monthly", anchorDay: 31, weekdays: [] }, "2026-11-30")).toBe("Every month on the 31st");
  });

  it("names weekly days, Monday first", () => {
    expect(describeRepeat(weekly([0, 1, 2, 3, 4, 5, 6]), TODAY)).toBe("Every day");
    expect(describeRepeat(weekly([5, 4, 3, 2, 1]), TODAY)).toBe("Every weekday");
    expect(describeRepeat(weekly([0]), TODAY)).toBe("Every Sunday");
    expect(describeRepeat(weekly([]), TODAY)).toBe("Every Thursday");
    expect(describeRepeat(weekly([0, 3, 1]), TODAY)).toBe("Every Mon, Wed, Sun");
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
  ])("%i -> %s", (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});

describe("describeDue", () => {
  it("describes relative days", () => {
    expect(describeDue(null, TODAY)).toBeNull();
    expect(describeDue(TODAY, TODAY)).toBe("Today");
    expect(describeDue("2026-10-30", TODAY)).toBe("Tomorrow");
    expect(describeDue("2026-10-28", TODAY)).toBe("1 day overdue");
    expect(describeDue("2026-10-26", TODAY)).toBe("3 days overdue");
  });

  it("formats later dates", () => {
    expect(describeDue("2026-10-31", TODAY)).toMatch(/^Sat,? 31 Oct$/);
  });
});

describe("isOpen", () => {
  it("is open when undated or due on/before today", () => {
    expect(isOpen({ dueOn: null }, TODAY)).toBe(true);
    expect(isOpen({ dueOn: "2026-10-01" }, TODAY)).toBe(true);
    expect(isOpen({ dueOn: TODAY }, TODAY)).toBe(true);
    expect(isOpen({ dueOn: "2026-10-30" }, TODAY)).toBe(false);
  });
});
