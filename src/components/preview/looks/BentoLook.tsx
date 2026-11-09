import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { SectionSummary } from "@/lib/data/homeSnapshot";
import { Bar, mostUrgent, paletteOf, Spark, toneColor, type LookProps, type Palette, isLong } from "./shared";

function Cell({ s, p, dark, big, className = "" }: { s: SectionSummary; p: Palette; dark: boolean; big?: boolean; className?: string }) {
  const sentence = isLong(s);
  return (
    <Link
      href={s.href}
      className={`flex min-w-0 flex-col rounded-3xl border p-4 transition-colors active:opacity-80 ${className}`}
      style={{ background: big ? p.brand : p.card, borderColor: big ? "transparent" : p.border, color: big ? (dark ? "#0b0d0c" : "#fff") : p.ink }}
    >
      <span className="flex items-start justify-between gap-2">
        <span className={`font-medium ${big ? "text-[15px] opacity-90" : "text-[13px]"}`} style={big ? undefined : { color: p.muted }}>
          {s.name}
        </span>
        <span className={big ? "rounded-2xl bg-white/90 p-0.5" : ""}>
          <Mascot kind={s.kind} size={big ? 44 : 28} decorative />
        </span>
      </span>
      {sentence ? (
        <span className={`mt-2 leading-snug font-medium ${big ? "line-clamp-4 text-[20px]" : "line-clamp-3 text-[14px]"}`}>{s.value}</span>
      ) : (
        <span className={`mt-auto font-semibold tracking-tight tabular-nums ${big ? "text-[56px] leading-none" : "text-[28px] leading-tight"}`}>
          {s.value}
          {s.unit && <span className={`ml-1 font-normal opacity-70 ${big ? "text-[16px]" : "text-[12px]"}`}>{s.unit}</span>}
        </span>
      )}
      {s.sub && (
        <span
          className={`truncate ${big ? "mt-1 text-[15px] font-medium" : "text-[12px]"}`}
          style={big ? undefined : { color: toneColor(s.tone, dark) ?? p.muted }}
        >
          {s.sub}
        </span>
      )}
      {big && s.detail && <span className="mt-1 truncate text-[13px] opacity-80">{s.detail}</span>}
      {big && s.progress !== undefined && (
        <span className="mt-4">
          <Bar value={s.progress} marker={s.marker} color="currentColor" track="rgba(255,255,255,0.25)" height={6} />
        </span>
      )}
      {!big && s.spark && (
        <span className="mt-2">
          <Spark values={s.spark} color={p.brand} track={p.track} height={20} />
        </span>
      )}
    </Link>
  );
}

/** Asymmetric bento: whatever needs you most today takes the big brand-coloured cell, the rest fill in around it. */
export function BentoLook({ snapshot, theme, dark = false }: LookProps) {
  const p = paletteOf(theme, dark);
  const hero = mostUrgent(snapshot.sections);
  const rest = snapshot.sections.filter((s) => s !== hero);
  // One tall cell beside two small ones, then pairs.
  const [tall, a, b, ...pairs] = rest;
  return (
    <div className="flex min-h-full flex-col gap-3 px-3 pt-6 pb-10" style={{ background: p.bg, color: p.ink }}>
      <header className="px-2 pb-1">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{snapshot.greeting}</h1>
        <p className="text-[13px]" style={{ color: p.muted }}>
          {snapshot.dateLabel}
          {hero.tone === "bad" ? ` · ${hero.name} needs you` : ""}
        </p>
      </header>
      <Cell s={hero} p={p} dark={dark} big className="min-h-[220px]" />
      <div className="grid grid-cols-2 gap-3">
        {tall && <Cell s={tall} p={p} dark={dark} className="row-span-2 min-h-[260px]" />}
        {a && <Cell s={a} p={p} dark={dark} className="min-h-[124px]" />}
        {b && <Cell s={b} p={p} dark={dark} className="min-h-[124px]" />}
        {pairs.map((s, i) => (
          <Cell
            key={s.kind}
            s={s}
            p={p}
            dark={dark}
            className={`min-h-[140px] ${pairs.length % 2 === 1 && i === pairs.length - 1 ? "col-span-2" : ""}`}
          />
        ))}
      </div>
      <div className="rounded-3xl border p-4" style={{ background: p.card, borderColor: p.border }}>
        <p className="text-[12px] font-semibold" style={{ color: p.brand }}>
          Fact of the day
        </p>
        <p className="mt-1 text-[14px] leading-relaxed">{snapshot.fact.text}</p>
      </div>
    </div>
  );
}
