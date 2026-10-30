"use client";

import { useActionState, useOptimistic, useState } from "react";
import { logContactOn, toggleContactToday, unlogContact, type PeopleFormState } from "@/lib/actions/people";
import { describeSince } from "@/lib/reminders/routines";
import { formatDay } from "@/lib/reminders/schedule";
import { SheepCheckbox } from "@/components/reminders/SheepCheckbox";
import type { Contact, ContactKind } from "@/lib/data/people";
import { keepInput } from "./keepInput";
import { useQuickAction } from "./useQuickAction";

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
  tripContactOn,
  todayKey,
  footer,
}: {
  personId: string;
  name: string;
  recentContacts: Contact[];
  /** The day shared Waypoint trips count as seen (a trip still going = today). */
  tripContactOn: string | null;
  seeEveryDays: number | null;
  catchUp: boolean;
  todayKey: string;
  /** e.g. "Stop tracking", under the recent days. */
  footer?: React.ReactNode;
}) {
  const { run, error } = useQuickAction();
  const today = (kind: ContactKind) => recentContacts.some((c) => c.day === todayKey && c.kind === kind);
  const [checked, toggle] = useOptimistic({ seen: today("seen"), message: today("message") }, (prev, kind: ContactKind) => ({
    ...prev,
    [kind]: !prev[kind],
  }));
  const [kind, setKind] = useState<ContactKind>("seen");
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(async (prev: PeopleFormState, formData: FormData) => {
    const result = await logContactOn(prev, formData);
    if (result?.ok) setFormKey((k) => k + 1); // an empty date again
    return result;
  }, null);

  // Today's ticks, else the newest day before today (so taking today off shows the right
  // answer before the server replies), or a shared trip when that's later; like the list.
  const tick = checked.message ? "message" : checked.seen ? "seen" : null;
  const before = recentContacts.find((c) => c.day !== todayKey) ?? null;
  const last: { day: string; past: string } | null = tick
    ? { day: todayKey, past: CONTACT_LABEL[tick].past }
    : tripContactOn && (!before || tripContactOn > before.day)
      ? { day: tripContactOn, past: "trip" }
      : before && { day: before.day, past: CONTACT_LABEL[before.kind].past };
  const inTouchToday = last?.day === todayKey;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="grid grid-cols-2 gap-2">
        {(["seen", "message"] as const).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <SheepCheckbox
              checked={checked[k]}
              label={`${k === "seen" ? "Saw" : "Messaged"} ${name} today`}
              onChange={() =>
                run(async () => {
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
        {last && ` (${last.past})`}
        {seeEveryDays !== null && ` · catch up every ${seeEveryDays} d`}
      </p>
      {error && <p className="text-sm text-critical">{error}</p>}

      <form key={formKey} onSubmit={keepInput(formAction)} className="flex flex-col gap-1">
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
                aria-label={`Remove ${CONTACT_LABEL[c.kind].past} on ${formatDay(c.day)}`}
                onClick={() => run(() => unlogContact(personId, c.day, c.kind))}
                className="btn btn-ghost inline-flex h-11 w-11 items-center justify-center text-ink-muted"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {footer && <div className="-mx-3 -mb-2">{footer}</div>}
    </div>
  );
}
