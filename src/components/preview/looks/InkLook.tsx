import Link from "next/link";
import type { HomeSnapshot, SectionSummary } from "@/lib/data/homeSnapshot";
import type { Theme } from "@/lib/theme";
import { arrangeGrid, Bar, brandOf, isLong, toneColor } from "./shared";

const MUTED = "#737373";
const LINE = "#e5e5e5";

function Cell({ s, brand, wide, hero }: { s: SectionSummary; brand: string; wide?: boolean; hero?: boolean }) {
  const long = isLong(s);
  return (
    <Link
      href={s.href}
      className={`flex min-h-32 min-w-0 flex-col gap-1 border-r border-b p-4 hover:bg-[#fafafa] active:bg-[#f5f5f5] ${wide ? "col-span-2" : ""}`}
      style={{ borderColor: LINE }}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.1em] uppercase" style={{ color: MUTED }}>
        {s.tone === "bad" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: toneColor("bad") }} />}
        {s.name}
      </span>
      {long ? (
        <span className="line-clamp-3 text-[15px] leading-snug font-medium">{s.value}</span>
      ) : (
        <span className={`truncate font-semibold tracking-[-0.03em] tabular-nums ${hero ? "text-[40px] leading-none" : "text-[26px] leading-tight"}`}>
          {s.value}
          {s.unit && (
            <span className="ml-1 text-[13px] font-normal tracking-normal" style={{ color: MUTED }}>
              {s.unit}
            </span>
          )}
        </span>
      )}
      {s.sub && (
        <span className="truncate text-[12px]" style={{ color: toneColor(s.tone) ?? MUTED }}>
          {s.sub}
        </span>
      )}
      {(hero || (wide && !long)) && s.detail && (
        <span className="truncate text-[12px]" style={{ color: MUTED }}>
          {s.detail}
        </span>
      )}
      {s.progress !== undefined && (
        <span className="mt-auto pt-3">
          <Bar value={s.progress} marker={s.marker} color={s.tone === "bad" ? toneColor("bad")! : brand} track="#f0f0f0" height={2} />
        </span>
      )}
    </Link>
  );
}

/** Minimal mono: white, Inter, hairline grid, no mascots; the brand colour only on progress lines. */
export function InkLook({ snapshot, theme }: { snapshot: HomeSnapshot; theme: Theme }) {
  const brand = brandOf(theme).base;
  const [budget, ...rest] = snapshot.sections;
  return (
    <div className="flex min-h-full flex-col gap-8 bg-white px-5 pt-8 pb-10" style={{ color: "#0a0a0a", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase" style={{ color: MUTED }}>
          {snapshot.dateLabel}
        </p>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">{snapshot.greeting}</h1>
      </header>

      <div className="grid grid-cols-2 border-t border-l" style={{ borderColor: LINE }}>
        <Cell s={budget} brand={brand} wide hero />
        {arrangeGrid(rest).map(({ s, wide }) => (
          <Cell key={s.kind} s={s} brand={brand} wide={wide} />
        ))}
      </div>

      <p className="border-t pt-4 text-[13px] leading-relaxed" style={{ color: MUTED, borderColor: LINE }}>
        {snapshot.fact.text}
      </p>
    </div>
  );
}
