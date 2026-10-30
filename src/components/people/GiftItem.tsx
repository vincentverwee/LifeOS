"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { deleteGift, setGiftStatus, updateGift, type PeopleFormState } from "@/lib/actions/people";
import { formatCurrency } from "@/lib/format";
import { formatDay } from "@/lib/reminders/schedule";
import type { GiftStatus } from "@/lib/people/birthdays";
import type { GiftRow } from "@/lib/data/people";

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

/** The one step forward from each status, and back for a slip of the thumb. */
const NEXT: Record<GiftStatus, { status: GiftStatus; label: string } | null> = {
  idea: { status: "bought", label: "Bought" },
  bought: { status: "given", label: "Given" },
  given: null,
};
const BACK: Record<GiftStatus, { status: GiftStatus; label: string } | null> = {
  idea: null,
  bought: { status: "idea", label: "Not bought" },
  given: { status: "bought", label: "Not given" },
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

/** Edit in place: title, price, occasion, link, and the date once given. */
function GiftEditForm({ gift, todayKey, onDone }: { gift: GiftRow; todayKey: string; onDone: () => void }) {
  const [state, formAction] = useActionState(async (prev: PeopleFormState, formData: FormData) => {
    const result = await updateGift(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={gift.id} />
      <input
        name="title"
        type="text"
        required
        maxLength={200}
        autoComplete="off"
        aria-label="Gift"
        defaultValue={gift.title}
        className={FIELD}
      />
      <div className="flex gap-2">
        <input
          name="price"
          type="text"
          inputMode="decimal"
          aria-label="Price (optional)"
          placeholder="Price"
          defaultValue={gift.price !== null ? String(gift.price).replace(".", ",") : ""}
          className={`${FIELD} w-28 shrink-0`}
        />
        <input
          name="occasion"
          type="text"
          maxLength={100}
          aria-label="Occasion (optional)"
          placeholder="Birthday, Christmas…"
          defaultValue={gift.occasion ?? ""}
          className={`${FIELD} min-w-0 flex-1`}
        />
      </div>
      <input
        name="link"
        type="url"
        maxLength={2000}
        aria-label="Link (optional)"
        placeholder="https://…"
        defaultValue={gift.link ?? ""}
        className={FIELD}
      />
      {gift.givenOn && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Given on</span>
          <input name="givenOn" type="date" required max={todayKey} defaultValue={gift.givenOn} className={`${FIELD} w-44`} />
        </label>
      )}
      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
      <div className="flex gap-2">
        <SaveButton />
        <button type="button" onClick={onDone} className="btn btn-ghost inline-flex min-h-11 px-4 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** A gift row: title, its details, and buttons to move it along (or back), edit or delete it. */
export function GiftItem({ gift, todayKey }: { gift: GiftRow; todayKey: string }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const next = NEXT[gift.status];
  const back = BACK[gift.status];
  const details = [
    gift.status === "bought" ? "Bought" : null,
    gift.price !== null ? formatCurrency(gift.price) : null,
    gift.occasion,
  ].filter(Boolean);

  function move(status: GiftStatus) {
    startTransition(() => setGiftStatus(gift.id, status));
  }

  function remove() {
    if (!window.confirm(`Delete "${gift.title}"?`)) return;
    startTransition(() => deleteGift(gift.id));
  }

  if (editing) {
    return (
      <li className="rounded-2xl border border-primary bg-surface p-3">
        <GiftEditForm gift={gift} todayKey={todayKey} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 ${pending ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <p className="leading-snug font-medium break-words text-foreground">{gift.title}</p>
        {gift.givenOn && (
          // The date is the thing most often off (marked given a day late): one tap to fix it.
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Change the date ${gift.title} was given`}
            className="tap -mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-ink-muted"
          >
            Given {formatDay(gift.givenOn)}
            <span aria-hidden="true" className="text-primary">
              ✎
            </span>
          </button>
        )}
        {(details.length > 0 || gift.link) && (
          <p className="mt-0.5 text-sm text-ink-muted">
            {details.join(" · ")}
            {gift.link && (
              <>
                {details.length > 0 && " · "}
                <a href={gift.link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Link
                </a>
              </>
            )}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {next && (
          <button type="button" disabled={pending} onClick={() => move(next.status)} className="btn btn-outline inline-flex min-h-11 px-4 text-sm">
            ✓ {next.label}
          </button>
        )}
        {back && (
          <button type="button" disabled={pending} onClick={() => move(back.status)} className="btn btn-ghost inline-flex min-h-11 px-3 text-sm">
            {back.label}
          </button>
        )}
        <span className="ml-auto flex gap-1">
          <button type="button" disabled={pending} onClick={() => setEditing(true)} className="btn btn-ghost inline-flex min-h-11 px-3 text-sm">
            Edit
          </button>
          <button type="button" disabled={pending} onClick={remove} className="btn btn-ghost inline-flex min-h-11 px-3 text-sm">
            Delete
          </button>
        </span>
      </div>
    </li>
  );
}
