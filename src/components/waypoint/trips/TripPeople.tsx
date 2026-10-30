'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Users } from 'lucide-react';
import { addTripPerson, removeTripPerson } from '@/lib/actions/people';
import { groupColor } from '@/lib/people/family';
import { GroupDot } from '@/components/people/GroupDot';

type Person = { id: string; name: string; groupName: string | null };

const FIELD = 'rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground';
const FAILED = "Couldn't save that. Check your connection and try again.";

/** "Who came along": People tagged on this trip (they get it under Trips together), add or remove them. */
export function TripPeople({
  tripId,
  people,
  everyone,
  groups,
}: {
  tripId: string;
  people: Person[];
  everyone: Person[];
  groups: string[];
}) {
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tagged = new Set(people.map((p) => p.id));
  const choices = everyone.filter((p) => !tagged.has(p.id));

  function add() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await addTripPerson(tripId, pick === 'new' ? { newName } : { personId: pick });
        if (result?.ok) {
          setPick('');
          setNewName('');
          setAdding(false);
        } else if (result) {
          setError(result.error);
        }
      } catch {
        setError(FAILED);
      }
    });
  }

  function remove(personId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await removeTripPerson(tripId, personId);
        if (result && !result.ok) setError(result.error);
      } catch {
        setError(FAILED);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-primary" />
        <h3 className="font-semibold">Who came along</h3>
      </div>
      <ul className={`flex flex-wrap gap-2 ${pending ? 'opacity-60' : ''}`}>
        {people.map((p) => (
          <li key={p.id} className="flex items-center rounded-full bg-surface-muted pl-3">
            <Link href={`/people/${p.id}`} className="flex min-h-11 items-center gap-2 text-sm text-foreground">
              <GroupDot color={groupColor(p.groupName, groups)} />
              {p.name}
            </Link>
            <button
              type="button"
              aria-label={`${p.name} didn't come`}
              disabled={pending}
              onClick={() => remove(p.id)}
              className="btn btn-ghost inline-flex h-11 w-11 items-center justify-center text-ink-muted"
            >
              ×
            </button>
          </li>
        ))}
        {!adding && (
          <li>
            <button type="button" onClick={() => setAdding(true)} className="btn btn-ghost inline-flex min-h-11 px-3 text-sm">
              {people.length ? '+ Add' : '+ Add who came along'}
            </button>
          </li>
        )}
      </ul>
      {adding && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select aria-label="Who" value={pick} onChange={(e) => setPick(e.target.value)} className={`${FIELD} sm:w-56`}>
            <option value="" disabled>
              Who?
            </option>
            <option value="new">+ Someone new…</option>
            {choices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {pick === 'new' && (
            <input
              type="text"
              maxLength={100}
              autoComplete="off"
              aria-label="Their name"
              placeholder="Their name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={`${FIELD} min-w-0 flex-1`}
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !pick || (pick === 'new' && !newName.trim())}
              onClick={add}
              className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold"
            >
              Add
            </button>
            <button type="button" onClick={() => setAdding(false)} className="btn btn-ghost inline-flex min-h-11 px-4 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
