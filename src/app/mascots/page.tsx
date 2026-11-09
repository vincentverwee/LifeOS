import type { CSSProperties } from "react";
import { Mascot } from "@/components/icons/Mascot";
import { LiveMascot } from "@/components/home/LiveMascot";
import { MOODS } from "@/components/icons/mascotMoods";
import { MASCOT_LINES, MASCOT_NAMES, mascotName } from "@/lib/mascots";
import { moodFor, type MoodInput } from "@/lib/mascotMood";
import { MASCOT_KINDS, type MascotAnimal, type MascotKind } from "@/components/icons/mascotProps";
import { THEME } from "@/lib/theme";

export const metadata = { title: "Mascots" };

const NAMES: Record<MascotKind, string> = {
  plain: "Plain (logo)",
  budget: "Budget",
  lessons: "Lessons",
  reminders: "Reminders",
  diary: "Diary",
  beer: "Beer",
  wardrobe: "Wardrobe",
  people: "People",
  waypoint: "Waypoint",
  recipes: "Recipes",
  workouts: "Workouts",
};

// The theme tokens copied from globals.css, so both animals show in both modes
// whatever this build's theme is (data-theme only works on <html>).
const SWATCHES: { animal: MascotAnimal; mode: string; style: CSSProperties }[] = [
  { animal: "sheep", mode: "light", style: { background: "#eef4ec", color: "#1f5c3b", ["--color-wool" as string]: "#ffffff" } },
  { animal: "sheep", mode: "dark", style: { background: "#1e2419", color: "#4c9a72", ["--color-wool" as string]: "#e9ece4" } },
  { animal: "cat", mode: "light", style: { background: "#fbecf2", color: "#b83a72", ["--color-wool" as string]: "#ffffff" } },
  { animal: "cat", mode: "dark", style: { background: "#271a21", color: "#e07aa8", ["--color-wool" as string]: "#f1e7ec" } },
];

const TILE_KINDS = MASCOT_KINDS.filter((k) => k !== "plain");

// Made-up data that puts each section's mascot in each of its moods (rules in src/lib/mascotMood.ts).
const SAMPLE_TODAY = "2026-11-08";
const budget = (spent: number, over = false): MoodInput => ({
  kind: "budget",
  budget: { over, spent, budget: 600, timeProgress: 0.5 },
});
const lessons = (todayHours: number, examInDays: number | null = null): MoodInput => ({
  kind: "lessons",
  lessons: { todayHours, goalHours: 4, examInDays, timerRunning: false },
});
const workouts = (o: Partial<Extract<MoodInput, { kind: "workouts" }>>): MoodInput => ({
  kind: "workouts",
  live: false,
  todayDone: false,
  goal: 3,
  done: 0,
  left: 3,
  daysLeft: 7,
  behind: false,
  missed: false,
  lastOn: "2026-11-05",
  ...o,
});
const SAMPLES: Record<Exclude<MascotKind, "plain">, MoodInput[]> = {
  budget: [budget(290), budget(180), budget(318)],
  lessons: [lessons(2), lessons(5), lessons(0), lessons(1, 2)],
  reminders: [{ kind: "reminders", open: 3, overdue: 0 }, { kind: "reminders", open: 0, overdue: 0 }, { kind: "reminders", open: 4, overdue: 2 }],
  diary: [{ kind: "diary", wroteToday: false }, { kind: "diary", wroteToday: true }],
  beer: [{ kind: "beer", lastVisit: "2026-11-05" }, { kind: "beer", lastVisit: SAMPLE_TODAY }, { kind: "beer", lastVisit: "2026-10-12" }],
  wardrobe: [
    { kind: "wardrobe", items: 30, wash: 3, lastWash: { coloured: "2026-11-06", white: "2026-11-02" } },
    { kind: "wardrobe", items: 30, wash: 0, lastWash: { coloured: "2026-11-06", white: "2026-11-02" } },
    { kind: "wardrobe", items: 30, wash: 2, lastWash: { coloured: "2026-11-06", white: "2026-10-27" } },
  ],
  people: [
    { kind: "people", total: 24, birthdayToday: null, catchUp: 0 },
    { kind: "people", total: 24, birthdayToday: "Anna", catchUp: 0 },
    { kind: "people", total: 24, birthdayToday: null, catchUp: 2 },
  ],
  waypoint: [{ kind: "waypoint", latest: "Normandy" }],
  recipes: [{ kind: "recipes", lastMade: "Dahl" }],
  workouts: [
    workouts({ done: 1, left: 2, daysLeft: 5 }),
    workouts({ done: 3, left: 0, daysLeft: 3 }),
    workouts({ done: 0, left: 3, daysLeft: 3, behind: true, lastOn: "2026-10-20" }),
    workouts({ done: 1, left: 2, daysLeft: 2, behind: true }),
    workouts({ goal: null, done: 0, left: 0, daysLeft: 3, lastOn: "2026-10-25" }),
  ],
};

/** Not linked anywhere: a page to look at every section mascot while tweaking them. */
export default function MascotsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mascots</h1>
        <p className="mt-1 text-sm text-ink-muted">
          One per section, sheep and cat, light and dark. Drawn in <code>src/components/icons/mascotProps.tsx</code>.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Alive</h2>
        <p className="text-sm text-ink-muted">
          Moods from made-up data (<code>src/lib/mascotMood.ts</code>). They bob and blink; tap one for its line. Between
          midnight and 6 everyone who isn&apos;t worried is asleep.
        </p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TILE_KINDS.map((kind, i) => {
            const name = mascotName(kind, THEME);
            return (
              <li key={kind} className="flex flex-col gap-3 card p-5">
                <div>
                  <p className="text-xl font-semibold text-foreground">{NAMES[kind]}</p>
                  <p className="text-sm text-ink-muted">{name}</p>
                </div>
                <ul className="flex flex-col gap-3">
                  {SAMPLES[kind].map((input, j) => {
                    const m = moodFor(input, name, SAMPLE_TODAY, 12);
                    return (
                      <li key={j} className="flex items-center gap-3">
                        <LiveMascot kind={kind} mood={m.mood} name={name} line={m.line} delay={(i * 3 + j) * 0.7} />
                        <span className="flex flex-col">
                          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">{m.mood}</span>
                          <span className="text-sm text-foreground">{m.line}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">On a Home tile</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TILE_KINDS.map((kind) => (
            <li key={kind} className="flex items-center gap-3 card p-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-primary">
                <Mascot kind={kind} size={52} decorative />
              </span>
              <span className="flex-1 text-xl font-semibold text-foreground">{NAMES[kind]}</span>
              <span aria-hidden="true" className="text-xl text-ink-muted">
                ›
              </span>
            </li>
          ))}
        </ul>
      </section>

      {[...TILE_KINDS, "plain" as const].map((kind) => (
        <section key={kind} className="flex flex-col gap-2">
          <h2 className="section-title">
            {NAMES[kind]}
            {kind !== "plain" && (
              <span className="ml-2 text-sm font-normal text-ink-muted">
                {MASCOT_NAMES[kind].sheep === MASCOT_NAMES[kind].cat
                  ? MASCOT_NAMES[kind].sheep
                  : `${MASCOT_NAMES[kind].sheep} / ${MASCOT_NAMES[kind].cat}`}
              </span>
            )}
          </h2>
          {kind !== "plain" && (
            <p className="text-sm text-ink-muted">
              {MASCOT_LINES[kind].map((l) => l.replace("{name} is ", "")).join(" · ")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SWATCHES.map((sw) => (
              <div
                key={`${sw.animal}-${sw.mode}`}
                style={sw.style}
                className="flex flex-col items-center gap-2 rounded-2xl p-3"
              >
                <Mascot kind={kind} animal={sw.animal} size={112} decorative />
                <div className="flex items-end gap-2">
                  <Mascot kind={kind} animal={sw.animal} size={52} decorative />
                  <Mascot kind={kind} animal={sw.animal} size={28} decorative />
                </div>
                <div className="flex items-end gap-1" title="happy · sleepy · worried">
                  {MOODS.filter((m) => m !== "default").map((m) => (
                    <Mascot key={m} kind={kind} mood={m} animal={sw.animal} size={40} decorative />
                  ))}
                </div>
                <span className="text-xs font-medium opacity-80">
                  {sw.animal} · {sw.mode}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="flex flex-col items-center gap-2 pb-6">
        <h2 className="section-title">Loading spinner</h2>
        <Mascot kind="beer" size={56} animate className="text-primary" />
      </section>
    </div>
  );
}
