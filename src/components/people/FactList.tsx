"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { addFact, deleteFact, updateFact, type PeopleFormState } from "@/lib/actions/people";
import type { FactRow } from "@/lib/data/people";

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

/** Suggestions for the label; anything else can be typed. */
const LABELS = [
  "Favourite drink",
  "Favourite food",
  "Favourite colour",
  "Shoe size",
  "Clothing size",
  "Allergies",
  "Studies",
  "Works at",
  "Lives in",
  "Partner",
  "Pets",
  "Hobbies",
];

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary inline-flex min-h-11 shrink-0 px-5 text-sm font-semibold">
      {pending ? "Saving…" : label}
    </button>
  );
}

/** Label + value inputs, shared by add and edit. */
function FactFields({ fact }: { fact?: FactRow }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        name="label"
        type="text"
        required
        maxLength={60}
        autoComplete="off"
        list="fact-labels"
        aria-label="What"
        placeholder="e.g. Favourite drink"
        defaultValue={fact?.label}
        className={`${FIELD} sm:w-48`}
      />
      <input
        name="value"
        type="text"
        required
        maxLength={500}
        autoComplete="off"
        aria-label="Answer"
        placeholder="e.g. Aperol"
        defaultValue={fact?.value}
        className={`${FIELD} min-w-0 flex-1`}
      />
    </div>
  );
}

function FactItem({ fact }: { fact: FactRow }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useActionState(async (prev: PeopleFormState, formData: FormData) => {
    const result = await updateFact(prev, formData);
    if (result?.ok) setEditing(false);
    return result;
  }, null);

  if (editing) {
    return (
      <li className="rounded-xl border border-primary bg-surface p-3">
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={fact.id} />
          <FactFields fact={fact} />
          {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
          <div className="flex gap-2">
            <SaveButton label="Save" />
            <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost inline-flex min-h-11 px-4 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${fact.label}"?`)) startTransition(() => deleteFact(fact.id));
              }}
              className="btn btn-ghost ml-auto inline-flex min-h-11 px-3 text-sm"
            >
              Delete
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={pending ? "opacity-60" : undefined}>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="tap flex min-h-11 w-full items-baseline gap-3 rounded-xl px-3 py-2 text-left"
        aria-label={`Edit ${fact.label}`}
      >
        <span className="w-32 shrink-0 text-sm text-ink-muted">{fact.label}</span>
        <span className="min-w-0 flex-1 break-words text-foreground">{fact.value}</span>
      </button>
    </li>
  );
}

/** "Things to remember": label → value lines. Tap one to edit it. */
export function FactList({ personId, facts }: { personId: string; facts: FactRow[] }) {
  const [key, setKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (prev: PeopleFormState, formData: FormData) => {
    const result = await addFact(prev, formData);
    if (result?.ok) setKey((k) => k + 1); // fresh, empty fields
    return result;
  }, null);

  return (
    <div className="flex flex-col gap-3">
      <datalist id="fact-labels">
        {LABELS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      {facts.length > 0 && (
        <ul className="-mx-3 flex flex-col">
          {facts.map((fact) => (
            <FactItem key={fact.id} fact={fact} />
          ))}
        </ul>
      )}
      {/* Empty: one calm link until there's something to add. */}
      {facts.length > 0 || open ? (
        <form key={key} action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="personId" value={personId} />
          <FactFields />
          <div>
            <SaveButton label="Add" />
          </div>
          {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="tap -mx-3 flex min-h-11 flex-col rounded-xl px-3 py-2 text-left">
          <span className="text-sm font-medium text-primary">+ Add something</span>
          <span className="text-sm text-ink-muted">Favourite drink, sizes, allergies, what they study…</span>
        </button>
      )}
    </div>
  );
}
