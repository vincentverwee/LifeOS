"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { resizeImage } from "@/lib/images/resize";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

/**
 * Take photo / From library / Remove, with a square preview: the photo is shrunk in the
 * browser (`resizeImage`; cut-outs keep their see-through background) before the form sends
 * it. The form gets the result through `onChange` and adds it to its FormData itself.
 * Used by Wardrobe items and Waypoint stickers.
 */
export function PhotoField({
  label,
  existing,
  empty,
  hasExisting,
  onChange,
  onShrinking,
  removable = true,
  cutoutSide,
  className = "h-28 w-28",
}: {
  label: string;
  /** The stored photo, shown while nothing new is picked and it isn't removed. */
  existing: React.ReactNode;
  /** Shown once the stored photo is removed (or when there is none). */
  empty: React.ReactNode;
  /** There is a stored photo (so Remove means "remove it on save"). */
  hasExisting: boolean;
  /** The shrunk new photo (null = none picked), and whether the stored one should go. */
  onChange: (photo: Blob | null, removed: boolean) => void;
  onShrinking?: (shrinking: boolean) => void;
  /** Offer "Remove photo" (off where a photo is required, e.g. stickers). */
  removable?: boolean;
  /** Longest side of a cut-out in px (`resizeImage`, default 700); stickers are shown small. */
  cutoutSide?: number;
  /** Size of the preview box. */
  className?: string;
}) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shrinking, setShrinking] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function busy(value: boolean) {
    setShrinking(value);
    onShrinking?.(value);
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    busy(true);
    try {
      const small = await resizeImage(file, { cutoutSide });
      setPhoto(small);
      setPreview(URL.createObjectURL(small));
      setRemoved(false);
      onChange(small, false);
    } catch {
      setError("Couldn't read that photo. Try another one.");
    } finally {
      busy(false);
    }
  }

  const showExisting = !preview && !removed && hasExisting;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-ink-muted">{label}</span>
      <div className="flex items-center gap-4">
        <div className={`relative shrink-0 overflow-hidden rounded-xl border border-border ${className}`}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="New photo"
              className={`h-full w-full bg-surface-muted ${photo && photo.type !== "image/jpeg" ? "cutout-glare object-contain p-[8%]" : "object-cover"}`}
            />
          ) : showExisting ? (
            existing
          ) : (
            empty
          )}
          {shrinking && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <SheepSpinner size={28} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} className="btn btn-outline inline-flex min-h-11 items-center gap-2 px-4 text-sm">
            <Camera size={18} aria-hidden="true" /> Take photo
          </button>
          <button type="button" onClick={() => libraryRef.current?.click()} className="btn btn-ghost inline-flex min-h-11 items-center gap-2 px-4 text-sm">
            <ImagePlus size={18} aria-hidden="true" /> From library
          </button>
          {removable && (preview || showExisting) && (
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setPreview(null);
                setRemoved(hasExisting);
                onChange(null, hasExisting);
              }}
              className="btn btn-ghost inline-flex min-h-11 px-4 text-sm text-critical"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={pick} className="hidden" />
      <input ref={libraryRef} type="file" accept="image/*" onChange={pick} className="hidden" />
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
