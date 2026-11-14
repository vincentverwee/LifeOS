// Shared by the comparison charts that can show the last few months as their own lines
// (Budget Insights, Beer Insights). Pure, so server pages build the series.
import { CATEGORY_COLOR_SLOTS, type CategoryColorSlot } from "@/lib/categoryPalette";

/** One earlier period drawn as an extra line on a comparison chart; `key` is its data key. */
export type EarlierSeries = { key: string; name: string; color: CategoryColorSlot };

/** Every slot but blue (blue is the dashed average line). */
const EARLIER_SLOTS = CATEGORY_COLOR_SLOTS.filter((s) => s !== "blue");

/** A colour per calendar month that stays put as you page through months. */
export function earlierColor(dateKey: string): CategoryColorSlot {
  const [y, m] = dateKey.split("-").map(Number);
  return EARLIER_SLOTS[(y * 12 + m - 1) % EARLIER_SLOTS.length];
}

const short = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

/** "Sep", or "Sep '25" when it isn't the year of the month being viewed. */
export function earlierName(dateKey: string, viewedKey: string): string {
  const name = short.format(new Date(`${dateKey.slice(0, 7)}-01T00:00:00Z`));
  return dateKey.slice(0, 4) === viewedKey.slice(0, 4) ? name : `${name} '${dateKey.slice(2, 4)}`;
}
