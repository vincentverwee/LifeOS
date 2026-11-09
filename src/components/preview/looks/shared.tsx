import type { HomeSnapshot, SectionSummary, Tone } from "@/lib/data/homeSnapshot";
import type { SectionKind } from "@/lib/data/homeMoods";
import { mascotName } from "@/lib/mascots";
import type { Theme } from "@/lib/theme";

/** The brand hue per build, in the few strengths the mockups need. */
export function brandOf(theme: Theme) {
  return theme === "cat"
    ? { base: "#b83a72", deep: "#7d2350", bright: "#f27aae", tint: "#f8e1ec" }
    : { base: "#1f5c3b", deep: "#163f2a", bright: "#3ccf87", tint: "#e2efe7" };
}

/** Status text colour per tone, for a light or dark surface. */
export function toneColor(tone: Tone, dark = false) {
  if (tone === "bad") return dark ? "#ff8a80" : "#c2410c";
  if (tone === "good") return dark ? "#6ee7a8" : "#15803d";
  return undefined;
}

/** A thin progress bar with an optional "where it should be" tick. */
export function Bar({
  value,
  marker,
  color,
  track,
  height = 4,
}: {
  value: number;
  marker?: number;
  color: string;
  track: string;
  height?: number;
}) {
  return (
    <div className="relative w-full rounded-full" style={{ height, background: track }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
      {marker !== undefined && (
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{ left: `calc(${marker * 100}% - 1px)`, top: -3, width: 2, height: height + 6, background: "currentColor", opacity: 0.45 }}
        />
      )}
    </div>
  );
}

/** Seven small bars (Mon→Sun). */
export function Spark({ values, color, track, height = 28 }: { values: number[]; color: string; track: string; height?: number }) {
  const top = Math.max(1, ...values);
  return (
    <div aria-hidden="true" className="flex items-end gap-1" style={{ height }}>
      {values.map((v, i) => (
        <div key={i} className="flex h-full flex-1 items-end rounded-[3px]" style={{ background: track }}>
          <div className="w-full rounded-[3px]" style={{ height: `${(v / top) * 100}%`, background: color }} />
        </div>
      ))}
    </div>
  );
}

/** A value that's a sentence (the diary line) rather than a number. */
export const isLong = (s: SectionSummary) => s.kind === "diary" || s.value.length > 12;

/** Two-column order without holes: number tiles first, a leftover one spans both columns, sentence tiles last at full width. */
export function arrangeGrid(sections: SectionSummary[]): { s: SectionSummary; wide: boolean }[] {
  const short = sections.filter((s) => !isLong(s));
  const long = sections.filter(isLong);
  return [
    ...short.map((s, i) => ({ s, wide: short.length % 2 === 1 && i === short.length - 1 })),
    ...long.map((s) => ({ s, wide: true })),
  ];
}

/** What every look gets: today's numbers, the build (sheep/cat) and light or dark (?mode=dark). */
export type LookProps = { snapshot: HomeSnapshot; theme: Theme; dark?: boolean };

/** Neutral surfaces + the brand for a light or dark mockup. */
export function paletteOf(theme: Theme, dark = false) {
  const b = brandOf(theme);
  return dark
    ? { bg: "#0f1113", card: "#181b1f", raised: "#20242a", ink: "#eceef0", muted: "#9aa0a6", border: "rgba(255,255,255,0.08)", track: "rgba(255,255,255,0.08)", brand: b.bright, tint: "rgba(255,255,255,0.06)" }
    : { bg: "#f5f4f0", card: "#ffffff", raised: "#ffffff", ink: "#1c1c1a", muted: "#6b6a66", border: "rgba(0,0,0,0.08)", track: "rgba(0,0,0,0.07)", brand: b.base, tint: b.tint };
}
export type Palette = ReturnType<typeof paletteOf>;

/** One hue per section (for looks that colour-code): a soft fill per mode and a strong accent. */
export const HUES: Record<SectionKind, { light: string; dark: string; accent: string; accentDark: string }> = {
  budget: { light: "#dff1e4", dark: "#1b3124", accent: "#2f7a4f", accentDark: "#7fd3a0" },
  lessons: { light: "#e3e8fb", dark: "#1e2440", accent: "#4057c9", accentDark: "#9aaaf5" },
  reminders: { light: "#fff1c9", dark: "#372e14", accent: "#9a7300", accentDark: "#f2cf63" },
  diary: { light: "#f6e2f0", dark: "#381e31", accent: "#a8418a", accentDark: "#ee9ad3" },
  beer: { light: "#fde8c4", dark: "#3a2911", accent: "#b06d0c", accentDark: "#f7bd63" },
  workouts: { light: "#ffe4d6", dark: "#3a2217", accent: "#c4541f", accentDark: "#ff9f72" },
  wardrobe: { light: "#dcf1f4", dark: "#173237", accent: "#237e8c", accentDark: "#7fd4e0" },
  people: { light: "#ffdfe0", dark: "#3c1d20", accent: "#c0434d", accentDark: "#ff9aa2" },
  waypoint: { light: "#e2ecdb", dark: "#232f1c", accent: "#527e35", accentDark: "#a9d48a" },
  recipes: { light: "#f3e6da", dark: "#342618", accent: "#9c5a30", accentDark: "#e7ab83" },
};
export const hueOf = (kind: SectionKind, dark = false) => {
  const h = HUES[kind];
  return { fill: dark ? h.dark : h.light, accent: dark ? h.accentDark : h.accent };
};

/** The section's mascot name on this build (Penny, Hops…). */
export const mascotOf = (kind: SectionKind, theme: Theme) => mascotName(kind, theme);

/** The section that most needs a look today: something "bad" first, else budget. */
export function mostUrgent(sections: SectionSummary[]): SectionSummary {
  return sections.find((s) => s.tone === "bad") ?? sections[0];
}
