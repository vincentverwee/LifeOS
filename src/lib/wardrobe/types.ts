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

/** A category as the pages use it. */
export type Category = { id: string; name: string };

/** The most a stored photo may weigh (the browser aims for ~100 KB). */
export const MAX_PHOTO_BYTES = 400_000;
export const PHOTO_MIME = "image/jpeg";
