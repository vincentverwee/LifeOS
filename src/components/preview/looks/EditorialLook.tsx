import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { HomeSnapshot } from "@/lib/data/homeSnapshot";
import type { Theme } from "@/lib/theme";
import { toneColor, isLong } from "./shared";

const PAPER = "#f6f1e7";
const SERIF = "var(--font-fraunces), Georgia, serif";

/** Editorial: warm paper, a serif masthead, the fact as a pull quote and sections as numbered rows with thin rules. */
export function EditorialLook({ snapshot, theme }: { snapshot: HomeSnapshot; theme: Theme }) {
  const ink = theme === "cat" ? "#3a1828" : "#1d2a22";
  const accent = theme === "cat" ? "#a3305f" : "#2c6a46";
  const muted = theme === "cat" ? "#86707a" : "#6f7a70";
  const rule = `${ink}26`;
  const [weekday, ...rest] = snapshot.dateLabel.split(" ");

  return (
    <div className="flex min-h-full flex-col px-5 pt-6 pb-10" style={{ background: PAPER, color: ink, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: ink }}>
        <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">Life, daily</span>
        <span style={{ color: ink, ["--color-wool" as string]: PAPER }}>
          <Mascot size={34} decorative />
        </span>
      </div>

      <header className="pt-5 pb-2">
        <h1 className="text-[44px] leading-[1.02] font-medium tracking-[-0.02em]" style={{ fontFamily: SERIF }}>
          {weekday}
          <br />
          {rest.join(" ")}
        </h1>
        <p className="mt-2 text-[18px] italic" style={{ fontFamily: SERIF, color: muted }}>
          {snapshot.greeting}.
        </p>
      </header>

      <figure className="my-6 border-l-2 pl-4" style={{ borderColor: accent }}>
        <figcaption className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: accent }}>
          Fact of the day
        </figcaption>
        <blockquote className="mt-1 text-[19px] leading-snug italic" style={{ fontFamily: SERIF }}>
          {snapshot.fact.text}
        </blockquote>
      </figure>

      <ol>
        {snapshot.sections.map((s, i) => {
          const long = isLong(s);
          return (
            <li key={s.kind} className="border-t" style={{ borderColor: rule }}>
              <Link href={s.href} className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-x-2 py-4 active:opacity-70">
                <span className="text-[13px] tabular-nums" style={{ fontFamily: SERIF, color: muted }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-[22px] leading-tight" style={{ fontFamily: SERIF }}>
                    {s.name}
                  </span>
                  {long ? (
                    <span className="mt-1 line-clamp-2 block text-[14px] leading-snug italic" style={{ fontFamily: SERIF }}>
                      {s.value}
                    </span>
                  ) : null}
                  {(s.sub || s.detail) && (
                    <span className="mt-0.5 block truncate text-[13px]" style={{ color: toneColor(s.tone) ?? muted }}>
                      {[s.sub, s.detail].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                {!long && (
                  <span className="text-right text-[22px] leading-tight tabular-nums" style={{ fontFamily: SERIF }}>
                    {s.value}
                    {s.unit && (
                      <span className="block text-[11px] tracking-[0.08em] uppercase" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", color: muted }}>
                        {s.unit}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="border-t-2" style={{ borderColor: ink }} />
    </div>
  );
}
