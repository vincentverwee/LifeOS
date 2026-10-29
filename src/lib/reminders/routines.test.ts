import { describe, expect, it } from "vitest";
import {
  averageInterval,
  compareRoutines,
  daysSince,
  describeRhythm,
  describeSince,
  isDue,
  isOverdue,
  type Routine,
} from "./routines";

const TODAY = "2026-10-29";

const routine = (name: string, lastDoneOn: string | null, everyDays: number | null = null): Routine => ({
  id: name,
  name,
  everyDays,
  lastDoneOn,
  recent: lastDoneOn ? [lastDoneOn] : [],
});

describe("daysSince", () => {
  it("counts days, null when never done", () => {
    expect(daysSince("2026-10-19", TODAY)).toBe(10);
    expect(daysSince(TODAY, TODAY)).toBe(0);
    expect(daysSince(null, TODAY)).toBeNull();
  });
});

describe("isDue / isOverdue", () => {
  it("is due but not overdue on the nudge day itself", () => {
    const r = { everyDays: 7, lastDoneOn: "2026-10-22" };
    expect(isDue(r, TODAY)).toBe(true);
    expect(isOverdue(r, TODAY)).toBe(false);
  });

  it("is both a day later, neither a day earlier", () => {
    expect(isDue({ everyDays: 7, lastDoneOn: "2026-10-21" }, TODAY)).toBe(true);
    expect(isOverdue({ everyDays: 7, lastDoneOn: "2026-10-21" }, TODAY)).toBe(true);
    expect(isDue({ everyDays: 7, lastDoneOn: "2026-10-23" }, TODAY)).toBe(false);
    expect(isOverdue({ everyDays: 7, lastDoneOn: "2026-10-23" }, TODAY)).toBe(false);
  });

  it("counts never done as due and overdue when there's a nudge", () => {
    expect(isDue({ everyDays: 7, lastDoneOn: null }, TODAY)).toBe(true);
    expect(isOverdue({ everyDays: 7, lastDoneOn: null }, TODAY)).toBe(true);
  });

  it("is never due without a nudge", () => {
    expect(isDue({ everyDays: null, lastDoneOn: null }, TODAY)).toBe(false);
    expect(isOverdue({ everyDays: null, lastDoneOn: "2020-01-01" }, TODAY)).toBe(false);
  });
});

describe("describeSince", () => {
  it("describes the gap", () => {
    expect(describeSince(null, TODAY)).toBe("Never");
    expect(describeSince(TODAY, TODAY)).toBe("Today");
    expect(describeSince("2026-10-28", TODAY)).toBe("Yesterday");
    expect(describeSince("2026-10-15", TODAY)).toBe("14 days ago");
  });

  it("says Today for a future date", () => {
    expect(describeSince("2026-11-02", TODAY)).toBe("Today");
  });
});

describe("averageInterval", () => {
  it("needs at least two logs", () => {
    expect(averageInterval([])).toBeNull();
    expect(averageInterval([TODAY])).toBeNull();
  });

  it("averages and rounds the gaps", () => {
    expect(averageInterval(["2026-10-29", "2026-10-20", "2026-10-10"])).toBe(10); // 19 / 2
    expect(averageInterval([TODAY, TODAY])).toBe(0);
  });

  it("only uses the latest six logs", () => {
    const six = ["2026-10-29", "2026-10-27", "2026-10-25", "2026-10-23", "2026-10-21", "2026-10-19"];
    expect(averageInterval([...six, "2025-01-01"])).toBe(2);
  });
});

describe("describeRhythm", () => {
  it("prefers the nudge, else the average, else null", () => {
    expect(describeRhythm({ everyDays: 14, recent: [] })).toBe("every 14 d");
    expect(describeRhythm({ everyDays: null, recent: ["2026-10-29", "2026-10-20"] })).toBe("usually every ~9 d");
    expect(describeRhythm({ everyDays: null, recent: ["2026-10-29"] })).toBeNull();
  });

  it("says nothing for a 0-day average", () => {
    expect(describeRhythm({ everyDays: null, recent: [TODAY, TODAY] })).toBeNull();
  });
});

describe("compareRoutines", () => {
  const sortNames = (routines: Routine[]) => [...routines].sort(compareRoutines(TODAY)).map((r) => r.name);

  it("puts due ones first, then longest ago (never done counts as longest)", () => {
    const list = [
      routine("recent", "2026-10-28"),
      routine("due", "2026-10-25", 3),
      routine("old", "2026-01-01"),
      routine("never", null),
    ];
    expect(sortNames(list)).toEqual(["due", "never", "old", "recent"]);
  });

  it("sorts never-done routines by name (Infinity - Infinity is NaN)", () => {
    expect(sortNames([routine("b", null), routine("c", null), routine("a", null)])).toEqual(["a", "b", "c"]);
    expect(sortNames([routine("z", null, 5), routine("y", null, 5)])).toEqual(["y", "z"]);
  });

  it("breaks ties on equal days by name", () => {
    expect(sortNames([routine("b", "2026-10-20"), routine("a", "2026-10-20")])).toEqual(["a", "b"]);
  });
});
