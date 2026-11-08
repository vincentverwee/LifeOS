import { CatHead } from "@/components/icons/Cat";
import { SheepHead } from "@/components/icons/Sheep";
import { catEyes, sheepEyes, type Mood } from "@/components/icons/mascotMoods";
import { MascotProp, type MascotAnimal, type MascotKind } from "@/components/icons/mascotProps";
import { THEME } from "@/lib/theme";

export type { MascotAnimal, MascotKind } from "@/components/icons/mascotProps";
export type { Mood } from "@/components/icons/mascotMoods";

type MascotProps = {
  /** Which section's prop to add; "plain" is exactly the <Sheep> mark. */
  kind?: MascotKind;
  /** A mood from your data (src/lib/mascotMood.ts); "default" is the section's resting face. */
  mood?: Mood;
  className?: string;
  /** Rendered size in px (square). */
  size?: number;
  animate?: boolean;
  decorative?: boolean;
  /** Defaults to the build's theme; /mascots overrides it to show both. */
  animal?: MascotAnimal;
};

/** The one small extra a mood may add, up and to the left of the head (clear of every prop):
 *  a sweat drop when worried, a "z" when sleepy. */
function MoodMark({ mood }: { mood: Mood }) {
  if (mood === "worried") {
    return (
      <path
        className="mascot-mark"
        d="M13 11 C15.6 14.6 17 16.8 17 18.6 A4 4 0 0 1 9 18.6 C9 16.8 10.4 14.6 13 11 Z"
        fill="var(--color-wool)"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    );
  }
  if (mood === "sleepy") {
    return (
      <g className="mascot-mark" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 9 H16 L9 17 H16" strokeWidth="2.2" />
        <path d="M17 0 H21.5 L17 5 H21.5" strokeWidth="1.6" />
      </g>
    );
  }
  return null;
}

/**
 * A section's mascot: the sheep (or cat) with a prop and a tiny mood in its eyes (mascotMoods.ts) — a pint for Beer, a chef
 * hat for Recipes… Same two tones as the logo. With a prop the drawing gets a
 * wider canvas so hats and things held in front fit. Tweak on /mascots.
 */
export function Mascot({
  kind = "plain",
  mood = "default",
  className,
  size = 100,
  animate,
  decorative,
  animal = THEME,
}: MascotProps) {
  const classes = [animate ? "animate-sheep-spin" : "", className].filter(Boolean).join(" ") || undefined;
  const label = animal === "cat" ? "Cat" : "Sheep";
  return (
    <svg
      viewBox={kind === "plain" ? "8 0 84 84" : "-2 -12 104 104"}
      width={size}
      height={size}
      {...(decorative ? { "aria-hidden": "true" } : { role: "img", "aria-label": label })}
      className={classes}
    >
      {animal === "cat" ? <CatHead eyes={catEyes(kind, mood)} /> : <SheepHead eyes={sheepEyes(kind, mood)} />}
      <MascotProp kind={kind} animal={animal} />
      <MoodMark mood={mood} />
    </svg>
  );
}
