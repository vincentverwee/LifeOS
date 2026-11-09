import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { HomeSnapshot, SectionSummary } from "@/lib/data/homeSnapshot";
import type { Theme } from "@/lib/theme";
import { Bar, brandOf, toneColor, isLong } from "./shared";

const GREY = "#8e8e93";
const SHADOW = "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)";

/** A thin ring for the budget: spent share of the month. */
function Ring({ value, color }: { value: number; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="-rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e5ea" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} />
    </svg>
  );
}

function Row({ s, tint, last }: { s: SectionSummary; tint: string; last: boolean }) {
  const long = isLong(s);
  return (
    <Link href={s.href} className="flex min-h-14 items-center gap-3 pl-4 active:bg-black/5">
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px]" style={{ background: tint }}>
        <Mascot kind={s.kind} size={30} decorative />
      </span>
      <span className={`flex min-h-14 min-w-0 flex-1 items-center gap-2 pr-4 ${last ? "" : "border-b border-black/[0.08]"}`}>
        <span className="flex min-w-0 flex-1 flex-col py-2">
          <span className="text-[17px] leading-tight">{s.name}</span>
          {s.sub && (
            <span className="truncate text-[13px]" style={{ color: toneColor(s.tone) ?? GREY }}>
              {s.sub}
            </span>
          )}
        </span>
        {!long && (
          <span className="shrink-0 text-[15px] tabular-nums" style={{ color: GREY }}>
            {s.value}
            {s.unit && !s.unit.includes(" ") && ` ${s.unit}`}
          </span>
        )}
        <span aria-hidden="true" className="text-[20px] leading-none" style={{ color: "#c7c7cc" }}>
          ›
        </span>
      </span>
    </Link>
  );
}

function Group({ title, items, tint }: { title: string; items: SectionSummary[]; tint: string }) {
  return (
    <section>
      <h2 className="px-4 pb-1.5 text-[13px] font-normal uppercase" style={{ color: GREY }}>
        {title}
      </h2>
      <div className="overflow-hidden rounded-[22px] bg-white" style={{ boxShadow: SHADOW }}>
        {items.map((s, i) => (
          <Row key={s.kind} s={s} tint={tint} last={i === items.length - 1} />
        ))}
      </div>
    </section>
  );
}

/** Apple-like: grey canvas, a "Today" widget, then grouped inset lists with small mascot badges. */
export function SoftLook({ snapshot, theme }: { snapshot: HomeSnapshot; theme: Theme }) {
  const brand = brandOf(theme);
  const by = (k: SectionSummary["kind"]) => snapshot.sections.find((s) => s.kind === k)!;
  const budget = by("budget");
  const lessons = by("lessons");
  const workouts = by("workouts");
  const today = snapshot.sections.filter((s) => ["budget", "lessons", "workouts", "reminders", "diary"].includes(s.kind));
  const rest = snapshot.sections.filter((s) => !today.includes(s));

  return (
    <div
      className="flex min-h-full flex-col gap-6 px-4 pt-6 pb-10"
      style={{ background: "#f2f2f7", color: "#1c1c1e", fontFamily: '-apple-system, "SF Pro Text", var(--font-inter), system-ui, sans-serif' }}
    >
      <header className="px-1">
        <p className="text-[13px] font-semibold uppercase" style={{ color: GREY }}>
          {snapshot.dateLabel}
        </p>
        <h1 className="text-[34px] leading-tight font-bold tracking-tight">{snapshot.greeting}</h1>
      </header>

      <Link href="/budget" className="block rounded-[22px] bg-white p-5 active:scale-[0.99]" style={{ boxShadow: SHADOW }}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium" style={{ color: GREY }}>
              {budget.sub ? budget.sub[0].toUpperCase() + budget.sub.slice(1) : "Budget"}
            </p>
            <p className="truncate text-[34px] leading-tight font-bold tracking-tight tabular-nums" style={{ color: toneColor(budget.tone) ?? "#1c1c1e" }}>
              {budget.value}
            </p>
          </div>
          {budget.progress !== undefined && <Ring value={budget.progress} color={budget.tone === "bad" ? "#ff3b30" : brand.base} />}
        </div>
        {budget.detail && (
          <p className="mt-1 truncate text-[13px]" style={{ color: GREY }}>
            {budget.detail}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-black/[0.08] pt-4">
          <div className="min-w-0">
            <p className="text-[13px]" style={{ color: GREY }}>
              Study
            </p>
            <p className="text-[22px] font-semibold tabular-nums">
              {lessons.value} <span className="text-[15px] font-normal" style={{ color: GREY }}>{lessons.unit}</span>
            </p>
            {lessons.progress !== undefined && <Bar value={lessons.progress} color={brand.base} track="#e5e5ea" />}
          </div>
          <div className="min-w-0">
            <p className="text-[13px]" style={{ color: GREY }}>
              Workouts
            </p>
            <p className="text-[22px] font-semibold tabular-nums">
              {workouts.value} <span className="text-[15px] font-normal" style={{ color: GREY }}>{workouts.unit}</span>
            </p>
            {workouts.progress !== undefined && <Bar value={workouts.progress} color={brand.base} track="#e5e5ea" />}
          </div>
        </div>
      </Link>

      <Group title="Today" items={today} tint={brand.tint} />
      <Group title="Collections" items={rest} tint={brand.tint} />

      <div className="rounded-[22px] bg-white p-4" style={{ boxShadow: SHADOW }}>
        <p className="text-[13px] font-semibold" style={{ color: brand.base }}>
          Fact of the day
        </p>
        <p className="mt-1 text-[15px] leading-snug">{snapshot.fact.text}</p>
      </div>
    </div>
  );
}
