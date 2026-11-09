import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { SectionSummary } from "@/lib/data/homeSnapshot";
import { brandOf, toneColor, type LookProps, isLong } from "./shared";

/** A pencil underline under a number, slightly wobbly. */
function Squiggle({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 8" preserveAspectRatio="none" className="-mt-1 h-2 w-full">
      <path d="M1 5 C 15 2, 25 7, 40 4 S 70 2, 99 5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function Entry({ s, pencil, accent, dark }: { s: SectionSummary; pencil: string; accent: string; dark: boolean }) {
  const sentence = isLong(s);
  return (
    <Link href={s.href} className="flex items-start gap-3 py-3 active:opacity-70">
      <span className="-rotate-3">
        <Mascot kind={s.kind} size={40} decorative />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-[family-name:var(--font-caveat)] text-[24px] leading-none" style={{ color: accent }}>
            {s.name}
          </span>
          {!sentence && (
            <span className="inline-flex flex-col items-end">
              <span className="font-[family-name:var(--font-caveat)] text-[28px] leading-none tabular-nums">
                {s.value}
                {s.unit && <span className="ml-1 text-[18px]">{s.unit}</span>}
              </span>
              <Squiggle color={accent} />
            </span>
          )}
        </span>
        {sentence && <span className="mt-1 block font-[family-name:var(--font-caveat)] text-[22px] leading-tight">“{s.value}”</span>}
        {s.sub && (
          <span className="block text-[13px]" style={{ color: toneColor(s.tone, dark) ?? pencil }}>
            {s.sub}
          </span>
        )}
        {s.detail && (
          <span className="block truncate text-[13px]" style={{ color: pencil }}>
            {s.detail}
          </span>
        )}
      </span>
    </Link>
  );
}

/** A paper notebook: ruled lines, a margin, handwritten headings and wobbly underlines; mascots tilted like stickers. */
export function NotebookLook({ snapshot, theme, dark = false }: LookProps) {
  const brand = brandOf(theme);
  const paper = dark ? "#1d1b17" : "#fbf8f1";
  const rule = dark ? "rgba(140,170,220,0.10)" : "rgba(80,120,200,0.13)";
  const margin = dark ? "rgba(240,120,120,0.25)" : "rgba(220,60,60,0.35)";
  const ink = dark ? "#ece6d8" : "#2b2a26";
  const pencil = dark ? "#a39d8f" : "#6f6a60";
  const accent = dark ? brand.bright : brand.base;
  return (
    <div
      className="min-h-full pt-6 pb-10 pl-12 pr-5"
      style={{
        color: ink,
        background: `linear-gradient(to right, transparent 34px, ${margin} 34px, ${margin} 36px, transparent 36px), repeating-linear-gradient(to bottom, ${paper} 0 31px, ${rule} 31px 32px)`,
        backgroundColor: paper,
      }}
    >
      <header className="pb-2">
        <p className="text-[13px]" style={{ color: pencil }}>
          {snapshot.dateLabel}
        </p>
        <h1 className="font-[family-name:var(--font-caveat)] text-[40px] leading-none" style={{ color: accent }}>
          {snapshot.greeting}
        </h1>
      </header>
      <div className="divide-y" style={{ borderColor: rule }}>
        {snapshot.sections.map((s) => (
          <Entry key={s.kind} s={s} pencil={pencil} accent={accent} dark={dark} />
        ))}
      </div>
      <div className="mt-4 rotate-1 rounded-sm p-4 shadow-md" style={{ background: dark ? "#3a3420" : "#fff3a8", color: dark ? "#f2e7b5" : "#4a4220" }}>
        <p className="font-[family-name:var(--font-caveat)] text-[22px] leading-none">Did you know?</p>
        <p className="mt-1 text-[14px] leading-relaxed">{snapshot.fact.text}</p>
      </div>
    </div>
  );
}
