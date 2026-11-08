import type { CSSProperties } from "react";
import { Mascot } from "@/components/icons/Mascot";
import { MASCOT_LINES, MASCOT_NAMES } from "@/lib/mascots";
import { MASCOT_KINDS, type MascotAnimal, type MascotKind } from "@/components/icons/mascotProps";

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

/** Not linked anywhere: a page to look at every section mascot while tweaking them. */
export default function MascotsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mascots</h1>
        <p className="mt-1 text-sm text-ink-muted">
          One per section, sheep and cat, light and dark. Drawn in <code>src/components/icons/mascotProps.tsx</code>.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">On a Home tile</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TILE_KINDS.map((kind) => (
            <li key={kind} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5">
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
          <h2 className="text-lg font-semibold text-foreground">
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
                <span className="text-xs font-medium opacity-80">
                  {sw.animal} · {sw.mode}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="flex flex-col items-center gap-2 pb-6">
        <h2 className="text-lg font-semibold text-foreground">Loading spinner</h2>
        <Mascot kind="beer" size={56} animate className="text-primary" />
      </section>
    </div>
  );
}
