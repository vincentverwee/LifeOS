import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { SectionSummary } from "@/lib/data/homeSnapshot";
import { paletteOf, toneColor, type LookProps, type Palette, isLong } from "./shared";

/** Sections with something about today or soon: due, a birthday, an exam, a running timer. */
const isAgenda = (s: SectionSummary) => s.tone === "bad" || /next|today|tomorrow|now|in \d+d|🎂/i.test(`${s.sub ?? ""} ${s.detail ?? ""}`);

function Item({ s, p, dark, last }: { s: SectionSummary; p: Palette; dark: boolean; last: boolean }) {
  const dot = s.tone === "bad" ? (toneColor("bad", dark) as string) : p.brand;
  return (
    <Link href={s.href} className="flex gap-3 active:opacity-70">
      <span className="flex w-5 flex-col items-center">
        <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2" style={{ borderColor: dot, background: s.tone === "bad" ? dot : p.bg }} />
        {!last && <span className="w-0.5 flex-1" style={{ background: p.border }} />}
      </span>
      <span className="flex min-w-0 flex-1 gap-3 pb-5">
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold tracking-wide uppercase" style={{ color: p.muted }}>
            {s.name}
          </span>
          <span className="block text-[16px] leading-snug font-medium">{s.detail ?? s.sub ?? s.value}</span>
          {s.detail && s.sub && (
            <span className="block truncate text-[13px]" style={{ color: toneColor(s.tone, dark) ?? p.muted }}>
              {s.sub}
            </span>
          )}
        </span>
        <Mascot kind={s.kind} size={34} decorative />
      </span>
    </Link>
  );
}

/** Day-first: a vertical timeline of what's due or coming up today, then everything else as a calm row of numbers. */
export function AgendaLook({ snapshot, theme, dark = false }: LookProps) {
  const p = paletteOf(theme, dark);
  const agenda = snapshot.sections.filter(isAgenda).sort((a, b) => Number(b.tone === "bad") - Number(a.tone === "bad"));
  const quiet = snapshot.sections.filter((s) => !agenda.includes(s));
  return (
    <div className="flex min-h-full flex-col gap-5 px-5 pt-7 pb-10" style={{ background: p.bg, color: p.ink }}>
      <header>
        <p className="text-[13px] font-semibold uppercase" style={{ color: p.brand }}>
          {snapshot.dateLabel}
        </p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{snapshot.greeting}</h1>
        <p className="mt-1 text-[14px]" style={{ color: p.muted }}>
          {agenda.length === 0 ? "Nothing on the list today." : `${agenda.length} ${agenda.length === 1 ? "thing" : "things"} for today`}
        </p>
      </header>
      {agenda.length > 0 && (
        <section>
          {agenda.map((s, i) => (
            <Item key={s.kind} s={s} p={p} dark={dark} last={i === agenda.length - 1} />
          ))}
        </section>
      )}
      <section className="rounded-2xl border" style={{ background: p.card, borderColor: p.border }}>
        <h2 className="px-4 pt-3 text-[12px] font-semibold tracking-wide uppercase" style={{ color: p.muted }}>
          Everything else
        </h2>
        <div className="grid grid-cols-3">
          {quiet.map((s) => {
            const sentence = isLong(s);
            return (
              <Link key={s.kind} href={s.href} className="flex min-w-0 flex-col items-center gap-0.5 px-2 py-3 text-center active:opacity-70">
                <Mascot kind={s.kind} size={30} decorative />
                <span className="max-w-full truncate text-[17px] font-semibold tabular-nums">{sentence ? "✎" : s.value}</span>
                <span className="max-w-full truncate text-[11px]" style={{ color: p.muted }}>
                  {sentence ? s.name : (s.unit ?? s.name)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <p className="px-1 text-[13px] leading-relaxed italic" style={{ color: p.muted }}>
        {snapshot.fact.text}
      </p>
    </div>
  );
}
