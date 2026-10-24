/**
 * The fixed, CVD-validated 8-hue categorical palette categories are drawn from.
 * Fixed order, never cycled — matches the dataviz skill's default categorical
 * theme. Every category's `color` column stores one of these slot keys, never a
 * raw hex, so light/dark values resolve through the --color-tag-* tokens in
 * globals.css.
 */
export const CATEGORY_COLOR_SLOTS = [
  "blue",
  "orange",
  "aqua",
  "yellow",
  "magenta",
  "green",
  "violet",
  "red",
] as const;

export type CategoryColorSlot = (typeof CATEGORY_COLOR_SLOTS)[number];

export function isCategoryColorSlot(value: string): value is CategoryColorSlot {
  return (CATEGORY_COLOR_SLOTS as readonly string[]).includes(value);
}
