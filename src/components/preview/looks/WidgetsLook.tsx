import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { SectionSummary } from "@/lib/data/homeSnapshot";
import { Bar, hueOf, paletteOf, Spark, toneColor, type LookProps, type Palette, isLong } from "./shared";

type Size = "s" | "m" | "l";

/** Budget gets the big square, sections with a week of bars the wide ones, the rest small squares. */
const sizeOf = (s: SectionSummary): Size => (s.kind === "budget" ? "l" : s.spark ? "m" : "s");

function Widget({ s, size, p, dark }: { s: SectionSummary; size: Size; p: Palette; dark: boolean }) {
  const hue = hueOf(s.kind, dark);
  const sentence = isLong(s);
  return (
    <Link
      href={s.href}
      className="relative flex w-full min-w-0 flex-col overflow-hidden rounded-[26px] p-3.5 active:scale-[0.98]"
      style={{ background: hue.fill, color: p.ink, transition: "transform 120ms" }}
    >
      <span className="flex items-center gap-1.5">
        <Mascot kind={s.kind} size={size === "s" ? 26 : 30} decorative />
        <span className="truncate text-[12px] font-semibold" style={{ color: hue.accent }}>
          {s.name}
        </span>
      </span>
      {sentence ? (
        <span className="mt-2 line-clamp-4 text-[14px] leading-snug font-medium">{s.value}</span>
      ) : (
        <span className={`mt-auto font-semibold tracking-tight tabular-nums ${size === "l" ? "text-[52px] leading-none" : "text-[34px] leading-none"}`}>
          {s.value}
          {s.unit && size !== "s" && <span className="ml-1 text-[14px] font-medium opacity-60">{s.unit}</span>}
        </span>
      )}
      <span className="mt-1 truncate text-[12px] font-medium" style={{ color: toneColor(s.tone, dark) ?? p.muted }}>
        {size === "s" && s.unit && !sentence ? s.unit : s.sub}
      </span>
      {size === "l" && s.progress !== undefined && (
        <span className="mt-3" style={{ color: p.ink }}>
          <Bar value={s.progress} marker={s.marker} color={hue.accent} track={p.track} height={8} />
        </span>
      )}
      {size === "l" && s.detail && (
        <span className="mt-2 truncate text-[12px]" style={{ color: p.muted }}>
          {s.detail}
        </span>
      )}
      {size === "m" && s.spark && (
        <span className="mt-2">
          <Spark values={s.spark} color={hue.accent} track={p.track} height={26} />
        </span>
      )}
    </Link>
  );
}

/** An iPhone home screen of widgets: one big square, a few wide ones, small squares; each section its own colour. */
export function WidgetsLook({ snapshot, theme, dark = false }: LookProps) {
  const p = paletteOf(theme, dark);
  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pt-6 pb-10" style={{ background: dark ? "#000" : "#eef0f3", color: p.ink }}>
      <header className="px-1">
        <p className="text-[13px] font-medium" style={{ color: p.muted }}>
          {snapshot.dateLabel}
        </p>
        <h1 className="text-[30px] leading-tight font-bold tracking-tight">{snapshot.greeting}</h1>
      </header>
      <div className="grid auto-rows-[150px] grid-cols-4 gap-3 [grid-auto-flow:dense]">
        {snapshot.sections.map((s, i, all) => {
          const smalls = all.filter((x) => sizeOf(x) === "s");
          const size = sizeOf(s) === "s" && smalls.length % 2 === 1 && smalls.at(-1) === s ? "m" : sizeOf(s);
          // Small widgets are 2 of the 4 columns wide (a square), the others 4.
          return (
            <div key={s.kind} className={size === "s" ? "col-span-2 flex" : size === "m" ? "col-span-4 flex" : "col-span-4 row-span-2 flex"}>
              <Widget s={s} size={size} p={p} dark={dark} />
            </div>
          );
        })}
      </div>
      <div className="rounded-[26px] p-4" style={{ background: p.card }}>
        <p className="text-[12px] font-semibold" style={{ color: p.brand }}>
          Fact of the day
        </p>
        <p className="mt-1 text-[14px] leading-relaxed">{snapshot.fact.text}</p>
      </div>
    </div>
  );
}
