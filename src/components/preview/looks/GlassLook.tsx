import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { SectionSummary } from "@/lib/data/homeSnapshot";
import { arrangeGrid, Bar, brandOf, Spark, type LookProps, isLong } from "./shared";

function Pane({ s, wide, dark, accent }: { s: SectionSummary; wide: boolean; dark: boolean; accent: string }) {
  const sentence = isLong(s);
  const muted = dark ? "rgba(255,255,255,0.65)" : "rgba(20,30,25,0.6)";
  return (
    <Link
      href={s.href}
      className={`flex min-h-[140px] min-w-0 flex-col rounded-[24px] border p-4 backdrop-blur-xl active:scale-[0.98] ${wide ? "col-span-2" : ""}`}
      style={{
        background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)",
        borderColor: dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.8)",
        boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,0.1)" : "0 8px 30px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        transition: "transform 120ms",
      }}
    >
      <span className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: dark ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)" }}>
          <Mascot kind={s.kind} size={28} decorative />
        </span>
        <span className="text-[13px] font-semibold" style={{ color: muted }}>
          {s.name}
        </span>
      </span>
      {sentence ? (
        <span className="mt-2 line-clamp-3 text-[15px] leading-snug font-medium">{s.value}</span>
      ) : (
        <span className="mt-auto text-[30px] leading-tight font-semibold tracking-tight tabular-nums">
          {s.value}
          {s.unit && (
            <span className="ml-1 text-[13px] font-medium" style={{ color: muted }}>
              {s.unit}
            </span>
          )}
        </span>
      )}
      {s.sub && (
        <span className="truncate text-[12px] font-medium" style={{ color: s.tone === "bad" ? (dark ? "#ffb4a8" : "#b4321d") : muted }}>
          {s.sub}
        </span>
      )}
      {s.spark && (
        <span className="mt-2">
          <Spark values={s.spark} color={accent} track={dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)"} height={20} />
        </span>
      )}
      {!s.spark && s.progress !== undefined && (
        <span className="mt-3">
          <Bar value={s.progress} marker={s.marker} color={accent} track={dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.8)"} height={6} />
        </span>
      )}
    </Link>
  );
}

/** Frosted glass panes floating over a soft brand-tinted gradient, like iOS control centre. */
export function GlassLook({ snapshot, theme, dark = false }: LookProps) {
  const brand = brandOf(theme);
  const bg = dark
    ? `radial-gradient(circle at 15% 10%, ${brand.base} 0, transparent 45%), radial-gradient(circle at 90% 40%, #3b2f6b 0, transparent 45%), radial-gradient(circle at 30% 90%, #0f3b4a 0, transparent 50%), #0b0d12`
    : `radial-gradient(circle at 10% 5%, ${brand.tint} 0, transparent 45%), radial-gradient(circle at 95% 35%, #e7defc 0, transparent 45%), radial-gradient(circle at 25% 85%, #d9f0f6 0, transparent 50%), #f3f4f1`;
  const accent = dark ? brand.bright : brand.base;
  return (
    <div className="flex min-h-full flex-col gap-3 px-4 pt-6 pb-10" style={{ background: bg, color: dark ? "#f3f5f7" : "#16201a" }}>
      <header className="px-1 pb-2">
        <p className="text-[13px] font-medium opacity-70">{snapshot.dateLabel}</p>
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight">{snapshot.greeting}</h1>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {arrangeGrid(snapshot.sections).map(({ s, wide }) => (
          <Pane key={s.kind} s={s} wide={wide} dark={dark} accent={accent} />
        ))}
      </div>
      <div
        className="rounded-[24px] border p-4 backdrop-blur-xl"
        style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.5)", borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.8)" }}
      >
        <p className="text-[12px] font-semibold" style={{ color: accent }}>
          Fact of the day
        </p>
        <p className="mt-1 text-[14px] leading-relaxed">{snapshot.fact.text}</p>
      </div>
    </div>
  );
}
