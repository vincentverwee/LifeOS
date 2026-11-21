import { describe, expect, it } from "vitest";
import { HABITS, habitGrid, habitStats, isHabitKey } from "./habits";

describe("habitStats", () => {
  it("starts the window at `since`, counts untouched days as misses, hardest first", () => {
    const logs = [
      { habit: "water", doneOn: "2026-11-19" },
      { habit: "water", doneOn: "2026-11-20" },
      { habit: "water", doneOn: "2026-11-21" },
      { habit: "sleep", doneOn: "2026-11-21" },
      { habit: "sleep", doneOn: "2026-11-01" }, // before since: ignored
    ];
    const stats = habitStats(logs, "2026-11-21", "2026-11-18");
    const water = stats.find((s) => s.habit.key === "water")!;
    expect(water).toMatchObject({ done: 3, days: 4, rate: 0.75 });
    expect(stats.find((s) => s.habit.key === "sleep")!.done).toBe(1);
    expect(stats.at(-1)!.habit.key).toBe("water");
    expect(stats[0].rate).toBe(0);
    expect(stats).toHaveLength(HABITS.length);
  });

  it("caps the window at `days` when turned on long ago", () => {
    expect(habitStats([], "2026-11-21", "2025-01-01", 30)[0].days).toBe(30);
  });
});

describe("habitGrid", () => {
  it("starts on a Monday and ends today", () => {
    const { keys, rows } = habitGrid([{ habit: "move", doneOn: "2026-11-21" }], "2026-11-21", 1); // a Saturday
    expect(keys).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]);
    expect(rows.find((r) => r.habit.key === "move")!.done.at(-1)).toBe(true);
    expect(habitGrid([], "2026-11-21", 4).keys[0]).toBe("2026-10-26");
  });
});

it("isHabitKey", () => {
  expect(isHabitKey("calm")).toBe(true);
  expect(isHabitKey("nope")).toBe(false);
});
