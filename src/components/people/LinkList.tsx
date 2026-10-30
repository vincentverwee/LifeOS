"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { addLink, deleteLink, updateLink, type PeopleFormState } from "@/lib/actions/people";
import { LINK_LABELS, mirrorLabel, type LinkView } from "@/lib/people/links";

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

type LinkRow = LinkView & { otherName: string };
type Choice = { id: string; name: string; groupName: string | null };

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary inline-flex min-h-11 shrink-0 px-5 text-sm font-semibold">
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * "Anna is Louise's [mum]" / "Louise is Anna's [daughter]". Filling in the first
 * with a word that reads the same both ways (friend, partner…) fills in the second,
 * until the second is typed in by hand.
 */
function LabelFields({
  name,
  otherName,
  initial,
}: {
  name: string;
  otherName: string;
  initial?: { otherIs: string | null; selfIs: string | null };
}) {
  const [otherIs, setOtherIs] = useState(initial?.otherIs ?? "");
  const [selfIs, setSelfIs] = useState(initial?.selfIs ?? "");
  const [selfTouched, setSelfTouched] = useState(!!initial?.selfIs);
  const other = otherName || "They";

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm text-ink-muted">
          {other} is {name}&apos;s
        </span>
        <input
          name="otherIs"
          type="text"
          maxLength={40}
          autoComplete="off"
          list="link-labels"
          placeholder="e.g. sister"
          value={otherIs}
          onChange={(e) => {
            setOtherIs(e.target.value);
            if (!selfTouched) setSelfIs(mirrorLabel(e.target.value) ?? "");
          }}
          className={`${FIELD} min-w-0 flex-1 basis-32`}
        />
      </label>
      <label className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm text-ink-muted">
          {name} is {otherName ? `${otherName}'s` : "their"}
        </span>
        <input
          name="selfIs"
          type="text"
          maxLength={40}
          autoComplete="off"
          list="link-labels"
          placeholder="e.g. sister"
          value={selfIs}
          onChange={(e) => {
            setSelfIs(e.target.value);
            setSelfTouched(true);
          }}
          className={`${FIELD} min-w-0 flex-1 basis-32`}
        />
      </label>
    </div>
  );
}

function LinkItem({ link, personId, name }: { link: LinkRow; personId: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useActionState(async (prev: PeopleFormState, formData: FormData) => {
    const result = await updateLink(prev, formData);
    if (result?.ok) setEditing(false);
    return result;
  }, null);

  if (editing) {
    return (
      <li className="rounded-2xl border border-primary bg-surface p-3">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={link.id} />
          <input type="hidden" name="personId" value={personId} />
          <p className="font-medium text-foreground">{link.otherName}</p>
          <LabelFields name={name} otherName={link.otherName} initial={link} />
          {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
          <div className="flex gap-2">
            <SaveButton label="Save" />
            <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost inline-flex min-h-11 px-4 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Unlink ${name} and ${link.otherName}?`)) startTransition(() => deleteLink(link.id));
              }}
              className="btn btn-ghost ml-auto inline-flex min-h-11 px-3 text-sm"
            >
              Unlink
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`flex items-center gap-1 rounded-2xl border border-border bg-surface pr-1 ${pending ? "opacity-60" : ""}`}>
      <Link href={`/people/${link.otherId}`} className="tap min-w-0 flex-1 rounded-2xl px-4 py-3">
        <span className="font-medium text-foreground">{link.otherName}</span>
        {link.otherIs && <span className="text-ink-muted"> · {link.otherIs}</span>}
      </Link>
      <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost inline-flex min-h-11 shrink-0 px-3 text-sm">
        Edit
      </button>
    </li>
  );
}

/** The people someone is linked to, and a form to link another (picked, or new by name). */
export function LinkList({
  personId,
  name,
  links,
  people,
}: {
  personId: string;
  name: string;
  links: LinkRow[];
  /** Everyone, to pick from (this person and those already linked are left out here). */
  people: Choice[];
}) {
  const [key, setKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [otherId, setOtherId] = useState("");
  const [newName, setNewName] = useState("");
  const [state, formAction] = useActionState(async (prev: PeopleFormState, formData: FormData) => {
    const result = await addLink(prev, formData);
    if (result?.ok) {
      setKey((k) => k + 1);
      setOtherId("");
      setNewName("");
      setAdding(false);
    }
    return result;
  }, null);

  const linked = new Set(links.map((l) => l.otherId));
  const choices = people.filter((p) => p.id !== personId && !linked.has(p.id));
  // Names aren't unique: show the group next to a name that appears twice.
  const counts = new Map<string, number>();
  for (const p of choices) counts.set(p.name, (counts.get(p.name) ?? 0) + 1);
  const otherName = otherId === "new" ? newName.trim() : (choices.find((p) => p.id === otherId)?.name ?? "");

  return (
    <div className="flex flex-col gap-3">
      <datalist id="link-labels">
        {LINK_LABELS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      {links.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <LinkItem key={link.id} link={link} personId={personId} name={name} />
          ))}
        </ul>
      ) : (
        !adding && <p className="text-sm text-ink-muted">Family, partner, friends they share with you…</p>
      )}

      {adding ? (
        <form key={key} action={formAction} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3">
          <input type="hidden" name="personId" value={personId} />
          <select
            name="otherId"
            required
            aria-label="Who"
            value={otherId}
            onChange={(e) => setOtherId(e.target.value)}
            className={FIELD}
          >
            <option value="" disabled>
              Who?
            </option>
            <option value="new">+ Someone new…</option>
            {choices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {counts.get(p.name)! > 1 && p.groupName ? ` (${p.groupName})` : ""}
              </option>
            ))}
          </select>
          {otherId === "new" && (
            <input
              name="newName"
              type="text"
              required
              maxLength={100}
              autoComplete="off"
              aria-label="Their name"
              placeholder="Their name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={FIELD}
            />
          )}
          <LabelFields name={name} otherName={otherName} />
          {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
          <div className="flex gap-2">
            <SaveButton label="Link" />
            <button type="button" onClick={() => setAdding(false)} className="btn btn-ghost inline-flex min-h-11 px-4 text-sm">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm">
          + Link someone
        </button>
      )}
    </div>
  );
}
