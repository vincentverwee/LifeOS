"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { createItem, updateItem, type WardrobeFormState } from "@/lib/actions/wardrobe";
import type { Category } from "@/lib/wardrobe/types";
import { resizeImage } from "@/lib/images/resize";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { ItemPhoto } from "./ItemPhoto";

type Item = { id: string; name: string; categoryId: string | null; color: string | null; photoId: string | null };

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

/** Add (no `item`) or edit a clothing item. The photo is shrunk here, before it's sent. */
export function ItemForm({
  item,
  colors,
  categories,
  defaultCategoryId,
}: {
  item?: Item;
  colors: string[];
  categories: Category[];
  /** New items: the category just used ("add another"), else the first one. */
  defaultCategoryId?: string | null;
}) {
  const [state, formAction, pending] = useActionState<WardrobeFormState, FormData>(
    item ? updateItem : createItem,
    null,
  );
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [shrinking, setShrinking] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setShrinking(true);
    try {
      const small = await resizeImage(file);
      setPhoto(small);
      setPreview(URL.createObjectURL(small));
      setRemovePhoto(false);
    } catch {
      setPhotoError("Couldn't read that photo. Try another one.");
    } finally {
      setShrinking(false);
    }
  }

  // Submitting by hand: keeps what was typed after an error (see keepInput) and adds the shrunk photo.
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    if (photo) formData.set("photo", new File([photo], "photo.jpg", { type: "image/jpeg" }));
    if (removePhoto) formData.set("removePhoto", "on");
    startTransition(() => formAction(formData));
  }

  const showExisting = !preview && !removePhoto && item?.photoId;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Photo (optional)</span>
        <div className="flex items-center gap-4">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="New photo" className="h-full w-full object-cover" />
            ) : (
              <ItemPhoto photoId={showExisting ? item!.photoId : null} name={item?.name ?? "No photo"} className="h-full w-full" />
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
            {(preview || showExisting) && (
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPreview(null);
                  setRemovePhoto(Boolean(item?.photoId));
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
        {photoError && <p className="text-sm text-critical">{photoError}</p>}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Name</span>
        <input
          name="name"
          type="text"
          required
          maxLength={100}
          autoComplete="off"
          defaultValue={item?.name}
          placeholder="e.g. Blue jeans"
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Category</span>
        <select
          name="categoryId"
          defaultValue={item ? (item.categoryId ?? "") : (defaultCategoryId ?? categories[0]?.id ?? "")}
          className={FIELD}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="">No category</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Colour (optional)</span>
        <input
          name="color"
          type="text"
          maxLength={40}
          autoComplete="off"
          list="clothing-colors"
          defaultValue={item?.color ?? ""}
          placeholder="black, navy, white…"
          className={FIELD}
        />
        <datalist id="clothing-colors">
          {colors.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}

      <button type="submit" disabled={pending || shrinking} className="btn btn-primary flex w-full px-4 py-3 text-base font-semibold">
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <SheepSpinner size={20} />
            Saving…
          </span>
        ) : item ? (
          "Save changes"
        ) : (
          "Add item"
        )}
      </button>
      {!item && (
        <button
          type="submit"
          name="next"
          value="another"
          disabled={pending || shrinking}
          className="btn btn-outline -mt-2 flex min-h-11 w-full px-4 text-sm"
        >
          Save &amp; add another
        </button>
      )}
    </form>
  );
}
