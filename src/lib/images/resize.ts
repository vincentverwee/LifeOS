import { PHOTO_LIMITS } from "./types";

/** A decoded photo, upright (EXIF rotation applied), ready to draw. */
type Source = { image: CanvasImageSource; width: number; height: number; close: () => void };

/** `createImageBitmap` where it takes options, else an <img> (browsers draw those upright too). */
async function decode(file: File): Promise<Source> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("Can't read that photo.");
    }
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  }
}

function draw(source: Source, maxSide: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Can't draw the photo.");
  ctx.drawImage(source.image, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

/** True when a noticeable part of the picture is see-through: a cut-out ("lift subject"). */
function hasCutout(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  let clear = 0;
  // Every 4th pixel is plenty to tell a removed background from a stray soft edge.
  for (let i = 3; i < data.length; i += 16) if (data[i] < 250) clear++;
  return clear / (data.length / 16) > 0.02;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * A cut-out as a PNG with at most 256 colours (lossy, like TinyPNG; see-through edges
 * kept): usually 3–4× smaller than the browser's own PNG, and stickers look the same.
 * Falls back to the plain PNG if the encoder can't load.
 */
async function smallPng(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<Blob | null> {
  try {
    const { default: UPNG } = await import("upng-js");
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const png = UPNG.encode([data.buffer as ArrayBuffer], canvas.width, canvas.height, 256);
    return new Blob([png], { type: "image/png" });
  } catch {
    return toBlob(canvas, "image/png");
  }
}

/**
 * Shrinks a photo in the browser before it is uploaded. A normal photo becomes a JPEG,
 * longest side 900 px (~100 KB). A photo with its background removed keeps it empty
 * (the app fills it with its own colour), longest side `cutoutSide`: WebP where the
 * browser can write it, else a 256-colour PNG (Safari, so every iPhone cut-out), made
 * smaller still if it would pass `PHOTO_LIMITS` (server actions cap requests at 1 MB).
 * Returns the blob; its `type` says which.
 */
export async function resizeImage(file: File, { cutoutSide = 700 }: { cutoutSide?: number } = {}): Promise<Blob> {
  const source = await decode(file);
  try {
    const { canvas, ctx } = draw(source, 900);
    if (!hasCutout(ctx, canvas.width, canvas.height)) {
      const jpeg = await toBlob(canvas, "image/jpeg", 0.75);
      if (!jpeg) throw new Error("Can't shrink the photo.");
      return jpeg;
    }
    for (const side of [1, 0.8, 0.64, 0.5].map((f) => Math.round(cutoutSide * f))) {
      const small = draw(source, side);
      const webp = await toBlob(small.canvas, "image/webp", 0.8);
      // Browsers that can't write WebP hand back a PNG instead.
      if (webp?.type === "image/webp") {
        if (webp.size <= PHOTO_LIMITS["image/webp"]) return webp;
        continue;
      }
      const png = await smallPng(small.canvas, small.ctx);
      if (!png) throw new Error("Can't shrink the photo.");
      if (png.size <= PHOTO_LIMITS["image/png"]) return png;
    }
    throw new Error("That photo is too big.");
  } finally {
    source.close();
  }
}
