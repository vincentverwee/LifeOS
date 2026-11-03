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

/**
 * Shrinks a camera photo in the browser before it is uploaded: longest side `maxSide` px,
 * JPEG. A phone photo is 3–5 MB; this comes out around 100 KB, well under MAX_PHOTO_BYTES.
 */
export async function resizeImage(file: File, maxSide = 900, quality = 0.75): Promise<Blob> {
  const source = await decode(file);
  try {
    const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Can't draw the photo.");
    // A transparent PNG would turn black as JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source.image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Can't shrink the photo.");
    return blob;
  } finally {
    source.close();
  }
}
