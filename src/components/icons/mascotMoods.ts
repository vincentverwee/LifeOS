import { LOGO_CAT_EYE, type CatEye } from "@/components/icons/Cat";
import { LOGO_SHEEP_EYE, type SheepEye } from "@/components/icons/Sheep";
import type { MascotKind } from "@/components/icons/mascotProps";

/**
 * The few section mascots with their own eyes (the rest keep the logo face):
 * Lessons squints, Beer smiles with closed eyes, People winks.
 */

type Mood = { sheep: { l: SheepEye; r: SheepEye }; cat: { l: CatEye; r: CatEye } };

const S = LOGO_SHEEP_EYE;
const C = LOGO_CAT_EYE;
const both = <T,>(e: T) => ({ l: e, r: e });

const MOODS: Partial<Record<MascotKind, Mood>> = {
  // concentrating behind the glasses
  lessons: { sheep: both({ ...S, sy: 0.6 }), cat: both({ ...C, ry: 3.4 }) },
  // happy closed eyes over a pint
  beer: { sheep: both({ ...S, closed: true }), cat: both({ ...C, closed: true }) },
  // Buddy winks
  people: { sheep: { l: S, r: { ...S, closed: true, sx: 0.7 } }, cat: { l: C, r: { ...C, closed: true } } },
};

export function sheepEyes(kind: MascotKind) {
  return MOODS[kind]?.sheep;
}

export function catEyes(kind: MascotKind) {
  return MOODS[kind]?.cat;
}

