"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addDiaryBit,
  deleteDiaryEntry,
  saveDiaryEntry,
  setDiaryMood,
  type DiaryFormState,
} from "@/lib/actions/diary";
import { diaryBits, MAX_BIT_LENGTH, MOODS } from "@/lib/diary/onThisDay";
import type { DiaryRow } from "@/lib/data/diary";

/**
 * One day of the diary: its bits so far, a quick box that adds another one to the end,
 * the mood, and an Edit mode that rewrites the whole day (one bit per line) or deletes it.
 */
export function DiaryForm({ date, entry, placeholder }: { date: string; entry: DiaryRow | null; placeholder: string }) {
  const bits = entry ? diaryBits(entry.text) : [];
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {editing && entry ? (
        <EditDay date={date} entry={entry} bits={bits} onDone={() => setEditing(false)} />
      ) : (
        <>
          {bits.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {bits.map((bit, i) => (
                <li key={i} className="flex gap-2 leading-snug text-foreground">
                  <span aria-hidden="true" className="text-ink-muted">
                    ·
                  </span>
                  <span className="min-w-0 flex-1">{bit}</span>
                </li>
              ))}
            </ul>
          )}
          <AddBit key={entry?.id ?? "new"} date={date} entry={entry} placeholder={placeholder} />
          {entry && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm"
            >
              Edit day
            </button>
          )}
        </>
      )}
    </div>
  );
}

function MoodPicker({ mood, onPick }: { mood: number | null; onPick: (mood: number | null) => void }) {
  return (
    <div role="radiogroup" aria-label="Mood" className="flex justify-between gap-1">
      {MOODS.map((m) => {
        const on = mood === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={m.label}
            title={m.label}
            onClick={() => onPick(on ? null : m.value)}
            className={`btn flex h-11 w-11 items-center justify-center text-2xl ${
              on ? "bg-primary/15 ring-2 ring-primary" : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
            }`}
          >
            {m.face}
          </button>
        );
      })}
    </div>
  );
}

/** The quick box: each Add puts one more bit at the end of the day. */
function AddBit({ date, entry, placeholder }: { date: string; entry: DiaryRow | null; placeholder: string }) {
  const [text, setText] = useState("");
  // On an existing day a mood tap saves at once; on a new day it waits for the first bit.
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [, startMood] = useTransition();
  const [state, formAction, saving] = useActionState<DiaryFormState, FormData>(async (prev, formData) => {
    const result = await addDiaryBit(prev, formData);
    if (result?.ok) setText("");
    return result;
  }, null);

  const left = MAX_BIT_LENGTH - text.length;

  function pickMood(next: number | null) {
    setMood(next);
    if (!entry) return;
    const formData = new FormData();
    formData.set("date", date);
    formData.set("mood", next === null ? "" : String(next));
    startMood(() => setDiaryMood(formData));
  }

  return (
    <>
      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="mood" value={mood ?? ""} />
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              name="text"
              required
              maxLength={MAX_BIT_LENGTH}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Add to this day"
              placeholder={placeholder}
              autoComplete="off"
              enterKeyHint="send"
              className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2.5 pr-10 text-foreground"
            />
            {left < 40 && (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs tabular-nums ${left < 20 ? "text-critical" : "text-ink-muted"}`}
              >
                {left}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="btn btn-primary inline-flex min-h-11 shrink-0 px-5 text-sm font-semibold"
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
        {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
      </form>
      <MoodPicker mood={mood} onPick={pickMood} />
    </>
  );
}

/** Rewrites the whole day, one bit per line; also where the day is deleted. */
function EditDay({ date, entry, bits, onDone }: { date: string; entry: DiaryRow; bits: string[]; onDone: () => void }) {
  const [text, setText] = useState(bits.join("\n"));
  const [mood, setMood] = useState<number | null>(entry.mood);
  const [deleting, startDelete] = useTransition();
  const [state, formAction, saving] = useActionState<DiaryFormState, FormData>(async (prev, formData) => {
    const result = await saveDiaryEntry(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, null);

  function remove() {
    const formData = new FormData();
    formData.set("date", date);
    startDelete(async () => {
      await deleteDiaryEntry(formData);
      onDone();
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="mood" value={mood ?? ""} />
      <textarea
        name="text"
        rows={Math.min(10, Math.max(3, bits.length + 1))}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="This day, one bit per line"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
      />
      <p className="-mt-1 text-xs text-ink-muted">One bit per line.</p>
      <MoodPicker mood={mood} onPick={setMood} />
      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={saving || !text.trim()} className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="btn btn-ghost inline-flex min-h-11 px-4 text-sm">
          Cancel
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="btn btn-ghost ml-auto inline-flex min-h-11 px-4 text-sm"
        >
          {deleting ? "Deleting…" : "Delete day"}
        </button>
      </div>
    </form>
  );
}
