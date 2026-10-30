"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createPerson, updatePerson, type PeopleFormState } from "@/lib/actions/people";
import { MONTH_NAMES, type Birthday } from "@/lib/people/birthdays";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

type Person = {
  id: string;
  name: string;
  groupName: string | null;
  birthday: Birthday | null;
  seeEveryDays: number | null;
};

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary flex w-full px-4 py-3 text-base font-semibold">
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <SheepSpinner size={20} />
          Saving…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

/** Add (no `person`) or edit someone. Only the name is needed; the rest can come later. */
export function PersonForm({ person, groups }: { person?: Person; groups: string[] }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState<PeopleFormState, FormData>(person ? updatePerson : createPerson, null);

  // Desktop: straight into the name when adding; phones keep the keyboard closed.
  useEffect(() => {
    if (!person && window.matchMedia("(min-width: 640px)").matches) nameRef.current?.focus();
  }, [person]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {person && <input type="hidden" name="id" value={person.id} />}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Name</span>
        <input
          ref={nameRef}
          name="name"
          type="text"
          required
          maxLength={100}
          autoComplete="off"
          defaultValue={person?.name}
          placeholder="e.g. Louise"
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Group (optional)</span>
        <input
          name="groupName"
          type="text"
          maxLength={50}
          autoComplete="off"
          list="people-groups"
          defaultValue={person?.groupName ?? ""}
          placeholder="Family, Friends, Uni…"
          className={FIELD}
        />
        <datalist id="people-groups">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm text-ink-muted">Birthday (optional)</legend>
        <div className="flex gap-2">
          <select name="birthDay" aria-label="Day" defaultValue={person?.birthday?.birthDay ?? ""} className={`${FIELD} w-20 shrink-0`}>
            <option value="">Day</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          <select
            name="birthMonth"
            aria-label="Month"
            defaultValue={person?.birthday?.birthMonth ?? ""}
            className={`${FIELD} min-w-0 flex-1`}
          >
            <option value="">Month</option>
            {MONTH_NAMES.map((month, i) => (
              <option key={month} value={i + 1}>
                {month}
              </option>
            ))}
          </select>
          <input
            name="birthYear"
            type="number"
            inputMode="numeric"
            aria-label="Year (optional)"
            min={1900}
            max={2100}
            defaultValue={person?.birthday?.birthYear ?? ""}
            placeholder="Year"
            className={`${FIELD} w-24 shrink-0`}
          />
        </div>
        <p className="text-sm text-ink-muted">With the year you also see the age they turn.</p>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Catch up every … days (optional)</span>
        <input
          name="seeEveryDays"
          type="number"
          inputMode="numeric"
          min={1}
          max={3650}
          defaultValue={person?.seeEveryDays ?? ""}
          placeholder="e.g. 30"
          className={`${FIELD} w-32`}
        />
        <span className="text-sm text-ink-muted">After that long without a “Saw them”, they’re flagged to catch up with.</span>
      </label>

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}

      <SubmitButton label={person ? "Save changes" : "Add person"} />
    </form>
  );
}
