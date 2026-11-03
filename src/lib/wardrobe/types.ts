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

/**
 * The photo types the server stores, with the most each may weigh. The browser makes
 * JPEGs of normal photos (~100 KB) and WebP/PNG of cut-outs (background removed).
 */
export const PHOTO_LIMITS: Record<string, number> = {
  "image/jpeg": 400_000,
  "image/webp": 400_000,
  "image/png": 900_000,
};

/** Cut-outs (see-through background) are shown whole, on the app's own colour. */
export function isCutout(mime: string | null | undefined): boolean {
  return mime === "image/webp" || mime === "image/png";
}
