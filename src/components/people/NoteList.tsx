"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { addNote, deleteNote, updateNote, type PeopleFormState } from "@/lib/actions/people";
import { formatDay } from "@/lib/reminders/schedule";
import type { NoteRow } from "@/lib/data/people";

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";
/** Notes shown before "Show all". */
const SHOWN = 5;

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary inline-flex min-h-11 shrink-0 px-5 text-sm font-semibold">
      {pending ? "Saving…" : label}
    </button>
  );
}

/** Text + date, shared by add and edit. */
function NoteFields({ note, todayKey }: { note?: NoteRow; todayKey: string }) {
  return (
    <>
      <textarea
        name="text"
        required
        rows={3}
        maxLength={4000}
        aria-label="Note"
        placeholder="What's new with them?"
        defaultValue={note?.text}
        className={FIELD}
      />
      <input
        name="date"
        type="date"
        required
        max={todayKey}
        aria-label="Date"
        defaultValue={note?.date ?? todayKey}
        className={`${FIELD} w-44`}
      />
    </>
  );
}

function NoteItem({ note, todayKey }: { note: NoteRow; todayKey: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useActionState(async (prev: PeopleFormState, formData: FormData) => {
    const result = await updateNote(prev, formData);
    if (result?.ok) setEditing(false);
    return result;
  }, null);

  if (editing) {
    return (
      <li className="rounded-2xl border border-primary bg-surface p-3">
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={note.id} />
          <NoteFields note={note} todayKey={todayKey} />
          {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
          <div className="flex gap-2">
            <SaveButton label="Save" />
            <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost inline-flex min-h-11 px-4 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete this note?")) startTransition(() => deleteNote(note.id));
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
        className="tap flex w-full flex-col gap-0.5 rounded-2xl border border-border bg-surface p-3 text-left"
      >
        <span className="text-sm text-ink-muted">{formatDay(note.date)}</span>
        <span className="break-words whitespace-pre-line text-foreground">{note.text}</span>
      </button>
    </li>
  );
}

/** Dated notes, newest first; tap one to edit it. */
export function NoteList({ personId, notes, todayKey }: { personId: string; notes: NoteRow[]; todayKey: string }) {
  const [key, setKey] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [state, formAction] = useActionState(async (prev: PeopleFormState, formData: FormData) => {
    const result = await addNote(prev, formData);
    if (result?.ok) setKey((k) => k + 1); // fresh, empty fields
    return result;
  }, null);
  const shown = showAll ? notes : notes.slice(0, SHOWN);

  return (
    <div className="flex flex-col gap-3">
      <form key={key} action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="personId" value={personId} />
        <NoteFields todayKey={todayKey} />
        <div>
          <SaveButton label="Add note" />
        </div>
        {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
      </form>
      {shown.length > 0 && (
        <ul className="flex flex-col gap-2">
          {shown.map((note) => (
            <NoteItem key={note.id} note={note} todayKey={todayKey} />
          ))}
        </ul>
      )}
      {notes.length > SHOWN && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm">
          {showAll ? "Show fewer" : `Show all ${notes.length}`}
        </button>
      )}
    </div>
  );
}
