"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteWorkout, saveAsTemplate } from "@/lib/actions/workouts";
import { FIELD } from "@/components/workouts/ui";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

const FAILED = "Couldn't save that. Check your connection and try again.";

/** Edit · Save as template · Delete (a second tap confirms; no browser dialogs). */
export function WorkoutActions({ id, hasSets, suggestedName }: { id: string; hasSets: boolean; suggestedName: string }) {
  const router = useRouter();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      try {
        await deleteWorkout(id);
        router.push("/workouts/log");
      } catch {
        setMessage(FAILED);
      }
    });
  }

  function template() {
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await saveAsTemplate(id, name);
        if (r.ok) {
          setNaming(false);
          setMessage("Saved as a template. Start it from Today.");
        } else setMessage(r.error);
      } catch {
        setMessage(FAILED);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Link href={`/workouts/${id}/edit`} className="btn btn-outline inline-flex min-h-11 px-5 text-sm">
          Edit
        </Link>
        {hasSets && !naming && (
          <button type="button" onClick={() => setNaming(true)} className="btn btn-outline min-h-11 px-5 text-sm">
            Save as template
          </button>
        )}
        <ConfirmButton onConfirm={remove} disabled={pending} className="min-h-11 px-5 text-sm">
          Delete
        </ConfirmButton>
      </div>
      {naming && (
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="sr-only">Template name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={`${FIELD} w-full`} />
          </label>
          <button type="button" onClick={template} disabled={pending || !name.trim()} className="btn btn-primary min-h-11 px-4 text-sm">
            Save
          </button>
          <button type="button" onClick={() => setNaming(false)} className="btn btn-ghost min-h-11 px-3 text-sm">
            Cancel
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-sm text-ink-muted">
          {message}
        </p>
      )}
    </div>
  );
}
