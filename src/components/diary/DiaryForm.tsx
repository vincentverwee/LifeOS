"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteDiaryEntry, saveDiaryEntry, type DiaryFormState } from "@/lib/actions/diary";
import { MAX_DIARY_LENGTH, MOODS } from "@/lib/diary/onThisDay";
import type { DiaryRow } from "@/lib/data/diary";

/** The line + mood for one day. Saving again rewrites that day's line. */
export function DiaryForm({ date, entry, placeholder }: { date: string; entry: DiaryRow | null; placeholder: string }) {
  const [text, setText] = useState(entry?.text ?? "");
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [deleting, startDelete] = useTransition();
  const [state, formAction, saving] = useActionState<DiaryFormState, FormData>(saveDiaryEntry, null);

  const changed = text.trim() !== (entry?.text ?? "") || mood !== (entry?.mood ?? null);
  const left = MAX_DIARY_LENGTH - text.length;

  function remove() {
    const formData = new FormData();
    formData.set("date", date);
    startDelete(async () => {
      await deleteDiaryEntry(formData);
      setText("");
      setMood(null);
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="mood" value={mood ?? ""} />
      <div className="relative">
        <textarea
          name="text"
          rows={2}
          required
          maxLength={MAX_DIARY_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Today's line"
          placeholder={placeholder}
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 pb-6 text-foreground"
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-3 bottom-2 font-mono text-xs tabular-nums ${left < 20 ? "text-critical" : "text-ink-muted"}`}
        >
          {left}
        </span>
      </div>

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
              onClick={() => setMood(on ? null : m.value)}
              className={`btn flex h-11 w-11 items-center justify-center text-2xl ${
                on ? "bg-primary/15 ring-2 ring-primary" : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
              }`}
            >
              {m.face}
            </button>
          );
        })}
      </div>

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !text.trim() || (entry !== null && !changed)}
          className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold"
        >
          {saving ? "Saving…" : entry ? (changed ? "Save" : "Saved") : "Save"}
        </button>
        {entry && (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="btn btn-ghost ml-auto inline-flex min-h-11 px-4 text-sm"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}
