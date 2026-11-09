import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { SectionSummary } from "@/lib/data/homeSnapshot";
import { paletteOf, toneColor, type LookProps, type Palette, isLong } from "./shared";

function Row({ s, p, dark, last }: { s: SectionSummary; p: Palette; dark: boolean; last: boolean }) {
  const sentence = isLong(s);
  return (
    <Link href={s.href} className="flex items-center gap-3 pl-3 active:opacity-70">
      <Mascot kind={s.kind} size={34} decorative />
      <span className="flex min-h-[60px] min-w-0 flex-1 items-center gap-2 pr-3" style={last ? undefined : { borderBottom: `1px solid ${p.border}` }}>
        <span className="min-w-0 flex-1 py-2">
          <span className="block text-[15px] leading-tight font-medium">{s.name}</span>
          <span className="block truncate text-[12px]" style={{ color: toneColor(s.tone, dark) ?? p.muted }}>
            {sentence ? s.value : (s.sub ?? s.detail ?? "")}
          </span>
        </span>
        {!sentence && (
          <span className="shrink-0 text-right">
            <span className="block font-mono text-[17px] leading-tight font-semibold tabular-nums">{s.value}</span>
            {s.unit && (
              <span className="block text-[11px] leading-tight" style={{ color: p.muted }}>
                {s.unit}
              </span>
            )}
          </span>
        )}
        <span aria-hidden="true" className="text-[18px]" style={{ color: p.muted }}>
          ›
        </span>
      </span>
    </Link>
  );
}

/** Maximum density: Settings-style grouped rows, one per section, value on the right. Everything on one screen. */
export function CompactLook({ snapshot, theme, dark = false }: LookProps) {
  const p = paletteOf(theme, dark);
  const needs = snapshot.sections.filter((s) => s.tone === "bad");
  const rest = snapshot.sections.filter((s) => s.tone !== "bad");
  const group = (title: string, items: SectionSummary[]) =>
    items.length > 0 && (
      <section>
        <h2 className="px-3 pb-1 text-[12px] font-semibold tracking-wide uppercase" style={{ color: p.muted }}>
          {title}
        </h2>
        <div className="overflow-hidden rounded-2xl border" style={{ background: p.card, borderColor: p.border }}>
          {items.map((s, i) => (
            <Row key={s.kind} s={s} p={p} dark={dark} last={i === items.length - 1} />
          ))}
        </div>
      </section>
    );
  return (
    <div className="flex min-h-full flex-col gap-4 px-3 pt-6 pb-10" style={{ background: p.bg, color: p.ink }}>
      <header className="px-3">
        <h1 className="text-[24px] leading-tight font-semibold">{snapshot.greeting}</h1>
        <p className="text-[13px]" style={{ color: p.muted }}>
          {snapshot.dateLabel}
        </p>
      </header>
      {group("Needs you", needs)}
      {group(needs.length > 0 ? "Everything else" : "Today", rest)}
      <p className="px-3 text-[12px] leading-relaxed" style={{ color: p.muted }}>
        {snapshot.fact.text}
      </p>
    </div>
  );
}
