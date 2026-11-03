export const KINDS = [
  { id: "top", label: "Tops" },
  { id: "bottom", label: "Bottoms" },
  { id: "dress", label: "Dresses" },
  { id: "jacket", label: "Jackets" },
  { id: "shoes", label: "Shoes" },
  { id: "accessory", label: "Accessories" },
  { id: "other", label: "Other" },
] as const;

export type ClothingKind = (typeof KINDS)[number]["id"];

export const STATUSES = ["clean", "wash", "drying"] as const;
export type ClothingStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<ClothingStatus, string> = {
  clean: "Clean",
  wash: "In the wash",
  drying: "Drying",
};

export function isKind(value: unknown): value is ClothingKind {
  return KINDS.some((k) => k.id === value);
}

export function isStatus(value: unknown): value is ClothingStatus {
  return (STATUSES as readonly string[]).includes(value as string);
}

export function kindLabel(kind: string): string {
  return KINDS.find((k) => k.id === kind)?.label ?? "Other";
}

/** The most a stored photo may weigh (the browser aims for ~100 KB). */
export const MAX_PHOTO_BYTES = 400_000;
export const PHOTO_MIME = "image/jpeg";
