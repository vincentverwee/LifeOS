import { LOGO_CAT_EYE, type CatEye } from "@/components/icons/Cat";
import { LOGO_SHEEP_EYE, type SheepEye } from "@/components/icons/Sheep";
import type { MascotKind } from "@/components/icons/mascotProps";

/**
 * Mascot eyes. Each section has a resting face (most keep the logo's; Lessons squints,
 * Beer smiles with closed eyes, People winks), and a live mascot can swap it for a
 * mood from your data (src/lib/mascotMood.ts). Faces stay minimal: only the eyes
 * change, plus at most one small mark (Mascot.tsx).
 */

export type Mood = "default" | "happy" | "sleepy" | "worried";
export const MOODS: Mood[] = ["default", "happy", "sleepy", "worried"];

type Eyes = { sheep: { l: SheepEye; r: SheepEye }; cat: { l: CatEye; r: CatEye } };

const S = LOGO_SHEEP_EYE;
const C = LOGO_CAT_EYE;
const both = <T,>(e: T) => ({ l: e, r: e });

const RESTING: Partial<Record<MascotKind, Eyes>> = {
  // concentrating behind the glasses
  lessons: { sheep: both({ ...S, sy: 0.6 }), cat: both({ ...C, ry: 3.4 }) },
  // happy closed eyes over a pint
  beer: { sheep: both({ ...S, closed: true }), cat: both({ ...C, closed: true }) },
  // Dolly winks
  people: { sheep: { l: S, r: { ...S, closed: true, sx: 0.7 } }, cat: { l: C, r: { ...C, closed: true } } },
};

const MOOD_EYES: Record<Exclude<Mood, "default">, Eyes> = {
  happy: { sheep: both({ ...S, closed: true }), cat: both({ ...C, closed: true }) },
  sleepy: { sheep: both({ ...S, sleepy: true }), cat: both({ ...C, sleepy: true }) },
  // rounder, flatter-slanted eyes, a touch lower: a little alarmed
  worried: {
    sheep: both({ slant: 4, sx: 0.85, sy: 1.35, dy: 0.6 }),
    cat: both({ rx: 4.4, ry: 6, tilt: -10, dy: 0.4 }),
  },
};

function eyesFor(kind: MascotKind, mood: Mood): Eyes | undefined {
  return mood === "default" ? RESTING[kind] : MOOD_EYES[mood];
}

export function sheepEyes(kind: MascotKind, mood: Mood = "default") {
  return eyesFor(kind, mood)?.sheep;
}

export function catEyes(kind: MascotKind, mood: Mood = "default") {
  return eyesFor(kind, mood)?.cat;
}
