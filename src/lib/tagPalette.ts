/**
 * The fixed, CVD-validated 8-hue categorical palette tags are drawn from.
 * Fixed order, never cycled — matches the dataviz skill's default categorical
 * theme. Every tag's `color` column stores one of these slot keys, never a
 * raw hex, so light/dark values resolve through the --color-tag-* tokens in
 * globals.css.
 */
export const TAG_COLOR_SLOTS = [
  "blue",
  "orange",
  "aqua",
  "yellow",
  "magenta",
  "green",
  "violet",
  "red",
] as const;

export type TagColorSlot = (typeof TAG_COLOR_SLOTS)[number];

export function isTagColorSlot(value: string): value is TagColorSlot {
  return (TAG_COLOR_SLOTS as readonly string[]).includes(value);
}
