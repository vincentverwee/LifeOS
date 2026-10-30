import { describe, expect, it } from "vitest";
import { birthdayIn, birthdayOf, describeCountdown, formatBirthday, isValidBirthday, nextBirthday, turningAge, upcoming } from "./birthdays";

const TODAY = "2026-10-30";

describe("isValidBirthday", () => {
  it("accepts 29 Feb without a year, and only in leap years with one", () => {
    expect(isValidBirthday({ birthMonth: 2, birthDay: 29, birthYear: null })).toBe(true);
    expect(isValidBirthday({ birthMonth: 2, birthDay: 29, birthYear: 2000 })).toBe(true);
    expect(isValidBirthday({ birthMonth: 2, birthDay: 29, birthYear: 1999 })).toBe(false);
  });

  it("rejects impossible days, months and years", () => {
    expect(isValidBirthday({ birthMonth: 4, birthDay: 31, birthYear: null })).toBe(false);
    expect(isValidBirthday({ birthMonth: 13, birthDay: 1, birthYear: null })).toBe(false);
    expect(isValidBirthday({ birthMonth: 1, birthDay: 0, birthYear: null })).toBe(false);
    expect(isValidBirthday({ birthMonth: 1, birthDay: 1, birthYear: 1850 })).toBe(false);
  });
});

describe("birthdayIn", () => {
  it("moves 29 Feb to the 28th outside leap years", () => {
    expect(birthdayIn(2027, { birthMonth: 2, birthDay: 29 })).toBe("2027-02-28");
    expect(birthdayIn(2028, { birthMonth: 2, birthDay: 29 })).toBe("2028-02-29");
  });
});

describe("nextBirthday", () => {
  it("is today on the day itself", () => {
    expect(nextBirthday({ birthMonth: 10, birthDay: 30 }, TODAY)).toBe("2026-10-30");
  });

  it("rolls over to next year once passed", () => {
    expect(nextBirthday({ birthMonth: 10, birthDay: 29 }, TODAY)).toBe("2027-10-29");
    expect(nextBirthday({ birthMonth: 1, birthDay: 1 }, "2026-12-31")).toBe("2027-01-01");
  });
});

describe("turningAge / upcoming", () => {
  it("counts the age on the next birthday", () => {
    expect(turningAge({ birthYear: 1996 }, "2026-11-07")).toBe(30);
    expect(turningAge({ birthYear: null }, "2026-11-07")).toBeNull();
    expect(upcoming({ birthMonth: 11, birthDay: 7, birthYear: 1996 }, TODAY)).toEqual({
      nextOn: "2026-11-07",
      daysUntil: 8,
      turning: 30,
    });
  });

  it("counts a passed birthday's age for next year", () => {
    expect(upcoming({ birthMonth: 1, birthDay: 5, birthYear: 2000 }, TODAY).turning).toBe(27);
  });
});

describe("describeCountdown", () => {
  it("reads naturally near and far", () => {
    expect(describeCountdown(0, TODAY)).toBe("Today");
    expect(describeCountdown(1, "2026-10-31")).toBe("Tomorrow");
    expect(describeCountdown(8, "2026-11-07")).toBe("In 8 days");
    expect(describeCountdown(30, "2026-11-29")).toBe("Sun 29 Nov");
  });
});

describe("formatBirthday", () => {
  it("shows the year only when known", () => {
    expect(formatBirthday({ birthMonth: 11, birthDay: 7, birthYear: null })).toBe("7 November");
    expect(formatBirthday({ birthMonth: 11, birthDay: 7, birthYear: 1996 })).toBe("7 November 1996");
  });
});

describe("birthdayOf", () => {
  it("is null without month and day", () => {
    expect(birthdayOf({ birthMonth: null, birthDay: null, birthYear: null })).toBeNull();
    expect(birthdayOf({ birthMonth: 11, birthDay: 11, birthYear: 2006 })).toEqual({ birthMonth: 11, birthDay: 11, birthYear: 2006 });
  });
});
