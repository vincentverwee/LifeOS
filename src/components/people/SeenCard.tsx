"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { logContactOn, toggleContactToday, unlogContact, type PeopleFormState } from "@/lib/actions/people";
import { describeSince } from "@/lib/reminders/routines";
import { formatDay } from "@/lib/reminders/schedule";
import { SheepCheckbox } from "@/components/reminders/SheepCheckbox";
import type { Contact, ContactKind } from "@/lib/data/people";

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

export const CONTACT_LABEL: Record<ContactKind, { today: string; icon: string; past: string }> = {
  seen: { today: "Saw them today", icon: "👋", past: "saw" },
  message: { today: "Messaged today", icon: "💬", past: "message" },
};

/**
 * Keeping in touch: a sheep box each for "saw them" and "messaged them" today
 * (again = take it off), back-dating, and the recent days. Either one counts as
 * catching up.
 */
export function SeenCard({
  personId,
  name,
  recentContacts,
  seeEveryDays,
  catchUp,
  todayKey,
}: {
  personId: string;
  name: string;
  recentContacts: Contact[];
  seeEveryDays: number | null;
  catchUp: boolean;
  todayKey: string;
}) {
  const [, startTransition] = useTransition();
  const today = (kind: ContactKind) => recentContacts.some((c) => c.day === todayKey && c.kind === kind);
  const [checked, toggle] = useOptimistic({ seen: today("seen"), message: today("message") }, (prev, kind: ContactKind) => ({
    ...prev,
    [kind]: !prev[kind],
  }));
  const [kind, setKind] = useState<ContactKind>("seen");
  const [state, formAction, pending] = useActionState<PeopleFormState, FormData>(logContactOn, null);

  // Before today, so taking today off shows the right answer before the server replies.
  const before = recentContacts.find((c) => c.day !== todayKey) ?? null;
  const inTouchToday = checked.seen || checked.message;
  const last = inTouchToday ? { day: todayKey, kind: (checked.message ? "message" : "seen") as ContactKind } : before;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="grid grid-cols-2 gap-2">
        {(["seen", "message"] as const).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <SheepCheckbox
              checked={checked[k]}
              label={`${k === "seen" ? "Saw" : "Messaged"} ${name} today`}
              onChange={() =>
                startTransition(async () => {
                  toggle(k);
                  await toggleContactToday(personId, k);
                })
              }
            />
            <span className="text-sm leading-tight font-medium text-foreground">{CONTACT_LABEL[k].today}</span>
          </div>
        ))}
      </div>
      <p className={`text-sm ${catchUp && !inTouchToday ? "text-critical" : "text-ink-muted"}`}>
        Last in touch: {describeSince(last?.day ?? null, todayKey).toLowerCase()}
        {last && ` (${CONTACT_LABEL[last.kind].past})`}
        {seeEveryDays !== null && ` · catch up every ${seeEveryDays} d`}
      </p>

      <form action={formAction} className="flex flex-col gap-1">
        <input type="hidden" name="personId" value={personId} />
        <input type="hidden" name="kind" value={kind} />
        <span className="text-sm text-ink-muted">Earlier…</span>
        <div className="flex gap-1 rounded-full bg-surface-muted p-1">
          {(["seen", "message"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`btn flex min-h-11 flex-1 px-3 text-sm ${
                kind === k ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
              }`}
            >
              {CONTACT_LABEL[k].icon} {k === "seen" ? "Saw them" : "Messaged"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input name="seenOn" type="date" required max={todayKey} aria-label="Date" className={`${FIELD} min-w-0 flex-1`} />
          <button type="submit" disabled={pending} className="btn btn-outline inline-flex min-h-11 px-5 text-sm">
            Log
          </button>
        </div>
        {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}
      </form>

      {recentContacts.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Recent contact">
          {recentContacts.map((c) => (
            <li key={`${c.day}-${c.kind}`} className="flex items-center rounded-full bg-surface-muted pl-3 text-sm text-foreground">
              <span aria-label={c.kind === "seen" ? "Saw" : "Messaged"}>{CONTACT_LABEL[c.kind].icon}</span>&nbsp;{formatDay(c.day)}
              <button
                type="button"
                aria-label={`Remove ${formatDay(c.day)}`}
                onClick={() => startTransition(() => unlogContact(personId, c.day, c.kind))}
                className="btn btn-ghost inline-flex h-11 w-11 items-center justify-center text-ink-muted"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
