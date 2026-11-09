"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { createItem, updateItem, type WardrobeFormState } from "@/lib/actions/wardrobe";
import { WASH_GROUPS, WASH_GROUP_LABEL, type Category, type WashGroup } from "@/lib/wardrobe/types";
import { PhotoField } from "@/components/images/PhotoField";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { ItemPhoto } from "./ItemPhoto";

type Item = {
  id: string;
  name: string;
  categoryId: string | null;
  washGroup: WashGroup;
  photoId: string | null;
  photoCutout: boolean;
  price: number | null;
};

const FIELD = "field";

/** Add (no `item`) or edit a clothing item. The photo is shrunk here, before it's sent. */
export function ItemForm({
  item,
  categories,
  defaultCategoryId,
}: {
  item?: Item;
  categories: Category[];
  /** New items: the category just used ("add another"), else the first one. */
  defaultCategoryId?: string | null;
}) {
  const [state, formAction, pending] = useActionState<WardrobeFormState, FormData>(
    item ? updateItem : createItem,
    null,
  );
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [shrinking, setShrinking] = useState(false);

  // Submitting by hand: keeps what was typed after an error (see keepInput) and adds the shrunk photo.
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    if (photo) formData.set("photo", new File([photo], "photo", { type: photo.type }));
    if (removePhoto) formData.set("removePhoto", "on");
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {item && <input type="hidden" name="id" value={item.id} />}

      <PhotoField
        label="Photo (optional)"
        hasExisting={Boolean(item?.photoId)}
        existing={<ItemPhoto photoId={item?.photoId ?? null} cutout={item?.photoCutout} name={item?.name ?? "No photo"} className="h-full w-full" />}
        empty={<ItemPhoto photoId={null} name="No photo" className="h-full w-full" />}
        onChange={(next, removed) => {
          setPhoto(next);
          setRemovePhoto(removed);
        }}
        onShrinking={setShrinking}
      />

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

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm text-ink-muted">Wash</legend>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1">
          {WASH_GROUPS.map((g) => (
            <label key={g} className="relative">
              <input
                type="radio"
                name="washGroup"
                value={g}
                defaultChecked={(item?.washGroup ?? "coloured") === g}
                className="peer sr-only"
              />
              <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-medium text-ink-muted peer-checked:bg-surface peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                {WASH_GROUP_LABEL[g]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Price (optional, shows cost per wear)</span>
        <input
          name="price"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={item?.price != null ? String(item.price).replace(".", ",") : ""}
          placeholder="e.g. 59,95"
          className={`${FIELD} w-40`}
        />
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
