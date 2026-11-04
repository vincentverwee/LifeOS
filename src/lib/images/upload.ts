import "server-only";
import { PHOTO_LIMITS } from "./types";

export type UploadedPhoto = { data: Uint8Array<ArrayBuffer>; mime: string };

/**
 * The uploaded photo in a server action's form (already shrunk by the browser): null when
 * none was picked, a string on error. The bytes must really be what the type says, because
 * the photo routes serve them with that type.
 */
export async function readPhoto(formData: FormData, field = "photo"): Promise<UploadedPhoto | null | string> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  const limit = PHOTO_LIMITS[file.type];
  if (!limit) return "That photo's format isn't supported.";
  if (file.size > limit) return "That photo is too big.";
  const data = new Uint8Array(await file.arrayBuffer());
  if (!looksLike(data, file.type)) return "That photo's format isn't supported.";
  return { data, mime: file.type };
}

function looksLike(data: Uint8Array, mime: string): boolean {
  const at = (offset: number, bytes: number[]) => bytes.every((b, i) => data[offset + i] === b);
  if (mime === "image/jpeg") return at(0, [0xff, 0xd8, 0xff]);
  if (mime === "image/png") return at(0, [0x89, 0x50, 0x4e, 0x47]);
  if (mime === "image/webp") return at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50]);
  return false;
}
