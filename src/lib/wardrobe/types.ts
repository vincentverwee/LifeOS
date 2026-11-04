/** Created the first time the wardrobe is used; rename, reorder or delete them on Settings. */
export const DEFAULT_CATEGORIES = ["Tops", "Bottoms", "Dresses", "Jackets", "Shoes", "Accessories"];

/** What an item without a category is listed under. */
export const NO_CATEGORY = "No category";

export const STATUSES = ["clean", "wash", "drying"] as const;
export type ClothingStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<ClothingStatus, string> = {
  clean: "Clean",
  wash: "In the wash",
  drying: "Drying",
};

export function isStatus(value: unknown): value is ClothingStatus {
  return (STATUSES as readonly string[]).includes(value as string);
}

/** Which load an item goes in (instead of its colour). */
export const WASH_GROUPS = ["coloured", "white"] as const;
export type WashGroup = (typeof WASH_GROUPS)[number];

export const WASH_GROUP_LABEL: Record<WashGroup, string> = {
  coloured: "Coloured",
  white: "White",
};

export function isWashGroup(value: unknown): value is WashGroup {
  return (WASH_GROUPS as readonly string[]).includes(value as string);
}

/** `Routine.source` of the Last done item each load logs when washed on Wardrobe → Wash. */
export const WASH_ROUTINE_SOURCE: Record<WashGroup, string> = {
  coloured: "wardrobe-wash-coloured",
  white: "wardrobe-wash-white",
};

/** What a load's Last done item is called when the first wash has to create it. */
export const WASH_ROUTINE_NAME: Record<WashGroup, string> = {
  coloured: "Wash (coloured)",
  white: "Wash (white)",
};

/** A category as the pages use it. */
export type Category = { id: string; name: string };

export { PHOTO_LIMITS, isCutout } from "@/lib/images/types";
