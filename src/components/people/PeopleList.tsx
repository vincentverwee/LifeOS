"use client";

import Link from "next/link";
import { useState } from "react";
import { describeCountdown, SOON_DAYS } from "@/lib/people/birthdays";
import { describeSince } from "@/lib/reminders/routines";
import type { PersonSummary } from "@/lib/data/people";

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

/** Everyone A–Z, narrowed by the search box and a group chip. */
export function PeopleList({ people, groups, todayKey }: { people: PersonSummary[]; groups: string[]; todayKey: string }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const shown = people.filter(
    (p) => (group === null || p.groupName === group) && (!q || p.name.toLowerCase().includes(q) || p.groupName?.toLowerCase().includes(q))
  );

  return (
    <div className="flex flex-col gap-3">
      {people.length > 5 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search people"
          placeholder="Search"
          className={FIELD}
        />
      )}
      {groups.length > 0 && (
        <div role="group" aria-label="Groups" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[null, ...groups].map((g) => {
            const on = group === g;
            return (
              <button
                key={g ?? "all"}
                type="button"
                aria-pressed={on}
                onClick={() => setGroup(g)}
                className={`btn inline-flex min-h-11 shrink-0 px-4 text-sm ${on ? "btn-primary" : "btn-outline"}`}
              >
                {g ?? "Everyone"}
              </button>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-muted">No one matches.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((p) => {
            const soon = p.next !== null && p.next.daysUntil < SOON_DAYS;
            const meta = [
              p.groupName,
              p.lastContactOn
                ? `${p.lastContactKind === "message" ? "Messaged" : "Seen"} ${describeSince(p.lastContactOn, todayKey).toLowerCase()}`
                : p.seeEveryDays !== null
                  ? "Never in touch"
                  : null,
            ].filter(Boolean);
            return (
              <li key={p.id}>
                <Link
                  href={`/people/${p.id}`}
                  className="tap flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-surface p-3 pl-4 hover:border-primary"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{p.name}</p>
                    {(meta.length > 0 || p.catchUp) && (
                      <p className="truncate text-sm text-ink-muted">
                        {p.catchUp ? <span className="text-critical">{meta.join(" · ")} · catch up</span> : meta.join(" · ")}
                      </p>
                    )}
                  </div>
                  {soon && p.next && (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium tabular-nums ${
                        p.next.daysUntil === 0 ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground"
                      }`}
                    >
                      🎂 {describeCountdown(p.next.daysUntil, p.next.nextOn)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
