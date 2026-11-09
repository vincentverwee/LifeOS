import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { SectionSummary } from "@/lib/data/homeSnapshot";
import type { Theme } from "@/lib/theme";
import { arrangeGrid, Bar, hueOf, mascotOf, paletteOf, Spark, type LookProps, isLong } from "./shared";

function Block({ s, wide, dark, theme, ink }: { s: SectionSummary; wide: boolean; dark: boolean; theme: Theme; ink: string }) {
  const hue = hueOf(s.kind, dark);
  const sentence = isLong(s);
  return (
    <Link
      href={s.href}
      className={`relative flex min-h-[168px] min-w-0 flex-col overflow-hidden rounded-[28px] p-4 active:scale-[0.98] ${wide ? "col-span-2" : ""}`}
      style={{ background: hue.fill, color: ink, transition: "transform 120ms" }}
    >
      {/* the mascot peeking in from the corner */}
      <span aria-hidden="true" className="absolute -right-3 -bottom-3 opacity-90">
        <Mascot kind={s.kind} size={72} decorative />
      </span>
      <span className="relative text-[12px] font-semibold tracking-wide uppercase" style={{ color: hue.accent }}>
        {s.name}
      </span>
      <span className="relative text-[12px] opacity-60">{mascotOf(s.kind, theme)}</span>
      {sentence ? (
        <span className="relative mt-2 line-clamp-3 pr-12 text-[15px] leading-snug font-medium">{s.value}</span>
      ) : (
        <span className="relative mt-auto text-[34px] leading-none font-bold tracking-tight tabular-nums">
          {s.value}
          {s.unit && <span className="ml-1 text-[13px] font-medium opacity-60">{s.unit}</span>}
        </span>
      )}
      {s.sub && (
        <span className="relative mt-1 truncate pr-14 text-[12px] font-medium" style={{ color: s.tone === "bad" ? hue.accent : undefined, opacity: s.tone === "bad" ? 1 : 0.7 }}>
          {s.tone === "bad" ? "● " : ""}
          {s.sub}
        </span>
      )}
      {s.spark && (
        <span className="relative mt-2 pr-14">
          <Spark values={s.spark} color={hue.accent} track={dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)"} height={18} />
        </span>
      )}
      {!s.spark && s.progress !== undefined && (
        <span className="relative mt-2 pr-14" style={{ color: ink }}>
          <Bar value={s.progress} marker={s.marker} color={hue.accent} track={dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)"} height={6} />
        </span>
      )}
    </Link>
  );
}

/** Every section its own soft colour block with its mascot peeking in: playful, easy to find by colour. */
export function PastelLook({ snapshot, theme, dark = false }: LookProps) {
  const p = paletteOf(theme, dark);
  return (
    <div className="flex min-h-full flex-col gap-3 px-3 pt-6 pb-10" style={{ background: dark ? "#121212" : "#fffdf9", color: p.ink }}>
      <header className="px-2 pb-1">
        <h1 className="text-[30px] leading-tight font-bold tracking-tight">{snapshot.greeting}</h1>
        <p className="text-[13px]" style={{ color: p.muted }}>
          {snapshot.dateLabel}
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {arrangeGrid(snapshot.sections).map(({ s, wide }) => (
          <Block key={s.kind} s={s} wide={wide} dark={dark} theme={theme} ink={p.ink} />
        ))}
      </div>
      <div className="rounded-[28px] p-4" style={{ background: p.tint }}>
        <p className="text-[12px] font-semibold tracking-wide uppercase" style={{ color: p.brand }}>
          Fact of the day
        </p>
        <p className="mt-1 text-[14px] leading-relaxed">{snapshot.fact.text}</p>
      </div>
    </div>
  );
}
