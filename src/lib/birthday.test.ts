import { describe, it, expect } from "vitest";
import { birthdayNote, birthdaySeenKey, isBirthday } from "./birthday";

describe("isBirthday", () => {
  it("is true on 11 November of any year", () => {
    expect(isBirthday("2026-11-11")).toBe(true);
    expect(isBirthday("2031-11-11")).toBe(true);
  });
  it("is false on other days", () => {
    expect(isBirthday("2026-11-10")).toBe(false);
    expect(isBirthday("2026-11-12")).toBe(false);
    expect(isBirthday("2026-01-11")).toBe(false);
  });
});

describe("birthdaySeenKey", () => {
  it("is per year", () => {
    expect(birthdaySeenKey("2026-11-11")).toBe("birthday-seen-2026");
    expect(birthdaySeenKey("2027-11-11")).not.toBe(birthdaySeenKey("2026-11-11"));
  });
});

describe("birthdayNote", () => {
  it("splits paragraphs on | and trims", () => {
    expect(birthdayNote("Hi, | lots of love |— me")).toEqual(["Hi,", "lots of love", "— me"]);
  });
  it("is empty when unset", () => {
    expect(birthdayNote(undefined)).toEqual([]);
    expect(birthdayNote("  ")).toEqual([]);
  });
});
