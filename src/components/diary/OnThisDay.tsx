import Link from "next/link";
import type { Memory } from "@/lib/data/diary";
import { describeYearsAgo, moodOf } from "@/lib/diary/onThisDay";
import { formatHours } from "@/lib/format";

const fullDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function Line({ icon, href, children }: { icon: string; href?: string; children: React.ReactNode }) {
  const body = (
    <>
      <span aria-hidden="true" className="w-6 shrink-0 text-center">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="tap -mx-2 flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-foreground">
          {body}
        </Link>
      ) : (
        <div className="flex min-h-11 items-center gap-2 text-sm text-foreground">{body}</div>
      )}
    </li>
  );
}

function MemoryCard({ memory: m }: { memory: Memory }) {
  const mood = moodOf(m.entry?.mood);
  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <Link href={`/diary/${m.date}`} className="tap -mx-2 -mt-1 flex min-h-11 items-baseline justify-between gap-3 rounded-lg px-2">
        <span className="font-semibold text-foreground">{describeYearsAgo(m.yearsAgo)}</span>
        <span className="text-sm text-ink-muted">{fullDate.format(new Date(`${m.date}T00:00:00Z`))}</span>
      </Link>

      {m.entry && (
        <p className="mt-1 text-base leading-snug text-foreground">
          {mood && (
            <span className="mr-1.5" role="img" aria-label={mood.label}>
              {mood.face}
            </span>
          )}
          {m.entry.text}
        </p>
      )}

      <ul className="mt-2 flex flex-col">
        {m.trips.map((t) => (
          <Line key={t.id} icon={t.withVan ? "🚐" : "🧭"} href={`/waypoint/trips/${t.id}`}>
            Day {t.day} of {t.title}
            {t.stop && <span className="text-ink-muted"> · {t.stop}</span>}
          </Line>
        ))}
        {m.beer && (
          <Line icon="🍺" href={m.beer.pubs.length === 1 ? `/beer/pubs/${m.beer.pubs[0].id}` : "/beer"}>
            {m.beer.pints > 0 ? `${m.beer.pints} ${m.beer.pints === 1 ? "pint" : "pints"}` : "A beer"}
            {m.beer.pubs.length > 0 && <span className="text-ink-muted"> · {m.beer.pubs.map((p) => p.name).join(", ")}</span>}
          </Line>
        )}
        {m.study && (
          <Line icon="📚" href={`/lessons/log?period=${m.study.periodId}`}>
            {m.study.dayOff ? (
              "Day off studying"
            ) : (
              <>
                {formatHours(m.study.hours)} studied
                {m.study.courses.length > 0 && <span className="text-ink-muted"> · {m.study.courses.join(", ")}</span>}
              </>
            )}
          </Line>
        )}
        {m.outfits.map((o) => (
          <Line key={o.id} icon="👕" href={o.href}>
            Wore {o.name}
          </Line>
        ))}
        {m.recipes.map((r) => (
          <Line key={r.id} icon="🍳" href={r.href}>
            Made {r.name}
          </Line>
        ))}
      </ul>
    </li>
  );
}

export function OnThisDay({ memories, emptyText }: { memories: Memory[]; emptyText: string }) {
  if (memories.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-ink-muted">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {memories.map((m) => (
        <MemoryCard key={m.yearsAgo} memory={m} />
      ))}
    </ul>
  );
}
