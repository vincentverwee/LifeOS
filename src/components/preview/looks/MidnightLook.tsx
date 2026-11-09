import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { HomeSnapshot, SectionSummary } from "@/lib/data/homeSnapshot";
import type { Theme } from "@/lib/theme";
import { arrangeGrid, Bar, brandOf, isLong, Spark, toneColor } from "./shared";

const BG = "#0b0d12";
const CARD = "#12151c";
const MUTED = "#8b90a0";
const BORDER = "rgba(255,255,255,0.08)";

/** A section's mascot drawn as a quiet line mark: outline in a muted grey, "wool" the card colour. */
function LineMark({ kind }: { kind: SectionSummary["kind"] }) {
  return (
    <span className="opacity-70" style={{ color: "#5b6170", ["--color-wool" as string]: CARD }}>
      <Mascot kind={kind} size={30} decorative />
    </span>
  );
}

function Tile({ s, accent, wide }: { s: SectionSummary; accent: string; wide: boolean }) {
  const long = isLong(s);
  return (
    <Link
      href={s.href}
      className={`flex min-h-[150px] min-w-0 flex-col gap-1 rounded-2xl border p-4 transition-colors hover:border-white/20 active:bg-white/[0.03] ${wide ? "col-span-2" : ""}`}
      style={{ background: CARD, borderColor: BORDER }}
    >
      <span className="flex items-center justify-between">
        <span className="text-[13px] font-medium" style={{ color: MUTED }}>
          {s.name}
        </span>
        <LineMark kind={s.kind} />
      </span>
      {long ? (
        <span className="line-clamp-3 text-[15px] leading-snug">{s.value}</span>
      ) : (
        <span className="truncate font-mono text-[26px] leading-tight font-semibold tabular-nums">
          {s.value}
          {s.unit && (
            <span className="ml-1 font-sans text-[13px] font-normal" style={{ color: MUTED }}>
              {s.unit}
            </span>
          )}
        </span>
      )}
      {s.sub && (
        <span className="truncate text-[12px]" style={{ color: toneColor(s.tone, true) ?? MUTED }}>
          {s.sub}
        </span>
      )}
      {(long || !s.spark) && s.detail && (
        <span className="truncate text-[12px]" style={{ color: MUTED }}>
          {s.detail}
        </span>
      )}
      {s.spark && !long && (
        <span className="mt-auto pt-3">
          <Spark values={s.spark} color={accent} track="rgba(255,255,255,0.06)" height={24} />
        </span>
      )}
    </Link>
  );
}

/** Dark-first: deep slate, hairline borders, a bento grid with a glowing budget hero; mascots as line marks. */
export function MidnightLook({ snapshot, theme }: { snapshot: HomeSnapshot; theme: Theme }) {
  const brand = brandOf(theme);
  const [budget, ...rest] = snapshot.sections;
  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pt-6 pb-10" style={{ background: BG, color: "#e6e8ee", colorScheme: "dark" }}>
      <header className="px-1 pb-2">
        <p className="text-[13px]" style={{ color: MUTED }}>
          {snapshot.dateLabel}
        </p>
        <h1 className="text-[28px] font-semibold tracking-tight">{snapshot.greeting}</h1>
      </header>

      <Link href={budget.href} className="relative block overflow-hidden rounded-2xl border p-5" style={{ background: CARD, borderColor: BORDER }}>
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full opacity-25 blur-3xl" style={{ background: brand.bright }} />
        <div className="relative flex flex-col gap-1">
          <span className="text-[13px] font-medium" style={{ color: MUTED }}>
            Budget · {budget.sub}
          </span>
          <span className="font-mono text-[40px] leading-tight font-semibold tabular-nums" style={{ color: budget.tone === "bad" ? "#ff8a80" : "#fff" }}>
            {budget.value}
          </span>
          {budget.progress !== undefined && (
            <span className="mt-3" style={{ color: "#fff" }}>
              <Bar value={budget.progress} marker={budget.marker} color={budget.tone === "bad" ? "#ff8a80" : brand.bright} track="rgba(255,255,255,0.08)" height={6} />
            </span>
          )}
          {budget.detail && (
            <span className="mt-2 truncate font-mono text-[12px]" style={{ color: MUTED }}>
              {budget.detail}
            </span>
          )}
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        {arrangeGrid(rest).map(({ s, wide }) => (
          <Tile key={s.kind} s={s} accent={brand.bright} wide={wide} />
        ))}
      </div>

      <div className="rounded-2xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: brand.bright }}>
          Fact of the day
        </p>
        <p className="mt-1 text-[14px] leading-relaxed" style={{ color: "#c3c7d2" }}>
          {snapshot.fact.text}
        </p>
      </div>
    </div>
  );
}
