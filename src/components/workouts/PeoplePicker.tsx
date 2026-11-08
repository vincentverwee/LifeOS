"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { FIELD } from "@/components/workouts/ui";

type Person = { id: string; name: string };

/** Who you trained with: chips with ×, plus a picker of everyone else. Sends repeated `people` fields. */
export function PeoplePicker({ everyone, initial }: { everyone: Person[]; initial: Person[] }) {
  const [picked, setPicked] = useState<Person[]>(initial);
  const others = everyone.filter((p) => !picked.some((q) => q.id === p.id));
  if (everyone.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-ink-muted">With</span>
      {picked.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {picked.map((p) => (
            <li key={p.id}>
              <input type="hidden" name="people" value={p.id} />
              <button
                type="button"
                onClick={() => setPicked((ps) => ps.filter((q) => q.id !== p.id))}
                aria-label={`Remove ${p.name}`}
                className="btn btn-outline inline-flex min-h-11 gap-1.5 pr-3 pl-4 text-sm"
              >
                {p.name} <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <select
          value=""
          aria-label="Add someone you trained with"
          onChange={(e) => {
            const p = others.find((o) => o.id === e.target.value);
            if (p) setPicked((ps) => [...ps, p]);
          }}
          className={FIELD}
        >
          <option value="">{picked.length === 0 ? "Anyone? (counts as seeing them)" : "Add someone…"}</option>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
