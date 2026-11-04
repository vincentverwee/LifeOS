/**
 * The photo types the server stores (clothing, stickers), with the most each may weigh. The
 * browser (`resizeImage`) makes JPEGs of normal photos (~100 KB) and WebP/PNG of cut-outs
 * (background removed).
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
