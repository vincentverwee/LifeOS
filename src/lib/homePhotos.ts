import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { THEME } from "@/lib/theme";

/*
 * Home's stock photos (Unsplash, credits in public/photos/CREDITS.md): a hero per time
 * of day and build (public/hero/<theme>-<slot>.jpg; a missing file = a painted sky).
 * The tile photos are plain data in src/lib/sectionPhotos.ts (client-safe).
 */

export type DaySlot = "dawn" | "day" | "dusk" | "night";

export const slotOf = (hour: number): DaySlot =>
  hour >= 5 && hour < 10 ? "dawn" : hour >= 10 && hour < 17 ? "day" : hour >= 17 && hour < 21 ? "dusk" : "night";

const exists = (...parts: string[]) => existsSync(join(process.cwd(), "public", ...parts));

/**
 * Where each hero photo's subject (the sheep) sits, as CSS object-position, so the wide
 * laptop crop and the phone crop both keep it in view. Unlisted photos stay centred.
 */
const HERO_FOCUS: Record<string, string> = {
  "sheep-dawn.jpg": "40% 55%", // the user's own photo
  "sheep-day.jpg": "60% 55%", // the user's own photo (the flock)
  "sheep-dusk.jpg": "50% 62%",
  "sheep-night.jpg": "45% 68%",
};

export type Hero = { src: string; position: string };

/** Numbered photos for a slot (`sheep-day-1.jpg`, `-2`…): Home shows a different one each day. */
function rotation(slot: DaySlot): string[] {
  const names: string[] = [];
  for (let n = 1; exists("hero", `${THEME}-${slot}-${n}.jpg`); n++) names.push(`${THEME}-${slot}-${n}.jpg`);
  return names;
}

/**
 * The hero photo for this time of day: one of the slot's numbered photos (picked by the
 * date, so it holds all day), else the slot's single photo, else the build's general one.
 */
export function heroPhoto(slot: DaySlot, todayKey?: string): Hero | null {
  const set = rotation(slot);
  if (set.length > 0) {
    const day = todayKey ? Math.floor(Date.parse(`${todayKey}T00:00:00Z`) / 86_400_000) : 0;
    const name = set[day % set.length];
    return { src: `/hero/${name}`, position: HERO_FOCUS[name] ?? "50% 50%" };
  }
  for (const name of [`${THEME}-${slot}.jpg`, `${THEME}.jpg`]) {
    if (exists("hero", name)) return { src: `/hero/${name}`, position: HERO_FOCUS[name] ?? "50% 50%" };
  }
  return null;
}

export { sectionPhoto } from "@/lib/sectionPhotos";
