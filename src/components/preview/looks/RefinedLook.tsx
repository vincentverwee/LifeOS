import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { SectionSummary } from "@/lib/data/homeSnapshot";
import type { Theme } from "@/lib/theme";
import { mascotOf, type LookProps, isLong } from "./shared";

/** Status colour from the app's own tokens: muted unless something is really good or bad. */
const toneClass = (s: SectionSummary) =>
  s.tone === "bad" ? "text-critical" : s.tone === "good" ? "text-positive-text" : "text-ink-muted";

/** The one fixed-height strip at the bottom of every tile: a bar, seven bars, or a quiet rule. */
function Visual({ s }: { s: SectionSummary }) {
  if (s.spark) {
    const top = Math.max(1, ...s.spark);
    return (
      <div aria-hidden="true" className="flex h-7 items-end gap-1">
        {s.spark.map((v, i) => (
          <div key={i} className="flex h-full flex-1 items-end rounded-[3px] bg-surface-muted">
            <div className="w-full rounded-[3px] bg-primary" style={{ height: `${(v / top) * 100}%` }} />
          </div>
        ))}
      </div>
    );
  }
  if (s.progress !== undefined) {
    return (
      <div aria-hidden="true" className="flex h-7 items-center">
        <div className="relative h-2 w-full rounded-full bg-surface-muted">
          <div className={`h-full rounded-full ${s.tone === "bad" ? "bg-critical" : "bg-primary"}`} style={{ width: `${s.progress * 100}%` }} />
          {s.marker !== undefined && (
            <div className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/50" style={{ left: `calc(${s.marker * 100}% - 1px)` }} />
          )}
        </div>
      </div>
    );
  }
  // Sections without numbers per day yet: a dotted placeholder so every tile is the same height.
  return (
    <div aria-hidden="true" className="flex h-7 items-end gap-1 opacity-60">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="h-1.5 flex-1 rounded-full bg-surface-muted" />
      ))}
    </div>
  );
}

function Tile({ s, theme }: { s: SectionSummary; theme: Theme }) {
  const sentence = isLong(s);
  return (
    <Link href={s.href} className="tap flex min-h-[196px] flex-col rounded-2xl border border-border bg-surface p-4 hover:border-primary">
      <span className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-primary">
          <Mascot kind={s.kind} size={38} decorative />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base leading-tight font-semibold text-foreground">{s.name}</span>
          <span className="block truncate text-xs text-ink-muted">{mascotOf(s.kind, theme)}</span>
        </span>
        <span aria-hidden="true" className="text-lg text-ink-muted">
          ›
        </span>
      </span>
      <span className="mt-4 flex min-h-[36px] items-baseline gap-1.5">
        {sentence ? (
          <span className="line-clamp-2 text-[15px] leading-snug font-medium text-foreground">{s.value}</span>
        ) : (
          <>
            <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">{s.value}</span>
            {s.unit && <span className="text-sm text-ink-muted">{s.unit}</span>}
          </>
        )}
      </span>
      <span className={`mt-1 truncate text-sm ${toneClass(s)}`}>{s.sub ?? " "}</span>
      <span className="mt-0.5 truncate text-xs text-ink-muted">{s.detail ?? " "}</span>
      <span className="mt-auto pt-3">
        <Visual s={s} />
      </span>
    </Link>
  );
}

/**
 * Today's Meadow, tidied: every tile the same anatomy (number + one-word unit,
 * muted status unless it's really good/bad, one detail line, a fixed visual strip).
 * Uses the app's real tokens, so it follows Light/Dark on /settings and the cat build.
 */
export function RefinedLook({ snapshot, theme }: LookProps) {
  return (
    <div className="flex min-h-full flex-col gap-4 bg-background px-4 pt-6 pb-10">
      <header className="px-1">
        <p className="text-sm text-ink-muted">{snapshot.dateLabel}</p>
        <h1 className="text-2xl font-semibold text-foreground">{snapshot.greeting}</h1>
      </header>
      <div className="@container">
        <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
        {snapshot.sections.map((s) => (
          <Tile key={s.kind} s={s} theme={theme} />
        ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Fact of the day</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{snapshot.fact.text}</p>
      </div>
    </div>
  );
}
