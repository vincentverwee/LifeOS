"use client";

import { useActionState, useState } from "react";
import { addGift, type PeopleFormState } from "@/lib/actions/people";
import { keepInput } from "@/components/people/keepInput";

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" disabled={pending} className="btn btn-primary inline-flex min-h-11 shrink-0 px-5 text-sm font-semibold">
      {pending ? "Adding…" : "Add"}
    </button>
  );
}

/** A new gift idea: just the title, with price / link / occasion behind "More". */
export function AddGiftForm({ personId }: { personId: string }) {
  const [more, setMore] = useState(false);
  const [key, setKey] = useState(0);
  const [state, formAction, pending] = useActionState(async (prev: PeopleFormState, formData: FormData) => {
    const result = await addGift(prev, formData);
    if (result?.ok) {
      setKey((k) => k + 1); // fresh, empty fields
      setMore(false);
    }
    return result;
  }, null);

  return (
    <form key={key} onSubmit={keepInput(formAction)} className="flex flex-col gap-2">
      <input type="hidden" name="personId" value={personId} />
      <div className="flex gap-2">
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          enterKeyHint="done"
          aria-label="Gift idea"
          placeholder="Gift idea"
          className={`${FIELD} min-w-0 flex-1`}
        />
        <SubmitButton pending={pending} />
      </div>
      {more ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              name="price"
              type="text"
              inputMode="decimal"
              aria-label="Price (optional)"
              placeholder="Price"
              className={`${FIELD} w-28 shrink-0`}
            />
            <input
              name="occasion"
              type="text"
              maxLength={100}
              aria-label="Occasion (optional)"
              placeholder="Birthday, Christmas…"
              className={`${FIELD} min-w-0 flex-1`}
            />
          </div>
          <input name="link" type="url" maxLength={2000} aria-label="Link (optional)" placeholder="https://…" className={FIELD} />
        </div>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm">
          + Price, occasion, link
        </button>
      )}
      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
    </form>
  );
}
