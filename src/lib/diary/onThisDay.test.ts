import { describe, expect, it } from "vitest";
import { cleanBit, dayOfTrip, describeYearsAgo, diaryBits, isMood, moodOf, sameDayInPastYears } from "./onThisDay";

describe("sameDayInPastYears", () => {
  it("lists the same day in earlier years, newest first", () => {
    const days = sameDayInPastYears("2026-11-03", 3);
    expect(days).toEqual([
      { yearsAgo: 1, year: 2025, keys: ["2025-11-03"] },
      { yearsAgo: 2, year: 2024, keys: ["2024-11-03"] },
      { yearsAgo: 3, year: 2023, keys: ["2023-11-03"] },
    ]);
  });

  it("works across the new year", () => {
    expect(sameDayInPastYears("2027-01-01", 1)[0].keys).toEqual(["2026-01-01"]);
    expect(sameDayInPastYears("2026-12-31", 1)[0].keys).toEqual(["2025-12-31"]);
  });

  it("puts 29 Feb on the 28th in other years", () => {
    const days = sameDayInPastYears("2028-02-29", 4);
    expect(days.map((d) => d.keys)).toEqual([["2027-02-28"], ["2026-02-28"], ["2025-02-28"], ["2024-02-29"]]);
  });

  it("on 28 Feb of a non-leap year also counts a leap year's 29 Feb", () => {
    const days = sameDayInPastYears("2025-02-28", 2);
    expect(days.map((d) => d.keys)).toEqual([["2024-02-28", "2024-02-29"], ["2023-02-28"]]);
  });

  it("on 28 Feb of a leap year keeps the 28th only", () => {
    expect(sameDayInPastYears("2028-02-28", 4).map((d) => d.keys)).toEqual([
      ["2027-02-28"],
      ["2026-02-28"],
      ["2025-02-28"],
      ["2024-02-28"],
    ]);
  });
});

describe("helpers", () => {
  it("describes years ago", () => {
    expect(describeYearsAgo(1)).toBe("1 year ago");
    expect(describeYearsAgo(4)).toBe("4 years ago");
  });

  it("counts trip days from 1", () => {
    expect(dayOfTrip("2025-07-01", "2025-07-01")).toBe(1);
    expect(dayOfTrip("2025-07-01", "2025-07-04")).toBe(4);
    expect(dayOfTrip("2025-02-27", "2025-03-02")).toBe(4);
  });

  it("knows the moods", () => {
    expect(isMood(3)).toBe(true);
    expect(isMood(0)).toBe(false);
    expect(isMood(2.5)).toBe(false);
    expect(moodOf(5)?.label).toBe("Great");
    expect(moodOf(null)).toBeNull();
  });
});

describe("diaryBits", () => {
  it("splits a day into its bits, one per line", () => {
    expect(diaryBits("Coffee with Anna\nRain all afternoon")).toEqual(["Coffee with Anna", "Rain all afternoon"]);
  });

  it("keeps an old single-line day as one bit", () => {
    expect(diaryBits("Just one line")).toEqual(["Just one line"]);
  });

  it("drops empty lines and tidies spaces", () => {
    expect(diaryBits("  a   b \n\n \r\n c\t")).toEqual(["a b", "c"]);
  });
});

describe("cleanBit", () => {
  it("collapses whitespace and line breaks into single spaces", () => {
    expect(cleanBit("  one\n two   three ")).toBe("one two three");
  });
});
