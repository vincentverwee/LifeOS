import Link from "next/link";
import type { SectionSummary } from "@/lib/data/homeSnapshot";
import { brandOf, type LookProps, isLong } from "./shared";

/** █ / ░ blocks for a 0–1 value. */
const blocks = (v: number, n = 16) => {
  const full = Math.round(Math.max(0, Math.min(1, v)) * n);
  return "█".repeat(full) + "░".repeat(n - full);
};
/** ▁▂▃▄▅▆▇█ per day. */
const spark = (values: number[]) => {
  const top = Math.max(1, ...values);
  return values.map((v) => "▁▂▃▄▅▆▇█"[Math.min(7, Math.round((v / top) * 7))]).join("");
};

function Line({ s, c }: { s: SectionSummary; c: { ink: string; dim: string; hi: string; bad: string } }) {
  const sentence = isLong(s);
  return (
    <Link href={s.href} className="block py-2 active:opacity-70">
      <span className="flex gap-2">
        <span style={{ color: c.hi }}>{">"}</span>
        <span className="w-[9ch] shrink-0 lowercase" style={{ color: c.dim }}>
          {s.name}
        </span>
        <span className="min-w-0 flex-1 truncate" style={{ color: s.tone === "bad" ? c.bad : c.ink }}>
          {sentence ? `"${s.value}"` : `${s.value}${s.unit ? ` ${s.unit}` : ""}`}
        </span>
      </span>
      {(s.sub || s.spark || s.progress !== undefined) && (
        <span className="flex gap-2 pl-[calc(11ch)]" style={{ color: c.dim }}>
          <span className="truncate">
            {s.spark ? `${spark(s.spark)}  ` : s.progress !== undefined ? `${blocks(s.progress, 12)}  ` : ""}
            <span style={{ color: s.tone === "bad" ? c.bad : s.tone === "good" ? c.hi : c.dim }}>{s.sub}</span>
          </span>
        </span>
      )}
    </Link>
  );
}

/** Terminal / teletext: monospace everything, block-character bars and sparks, no mascots, one accent. */
export function MonoLook({ snapshot, theme, dark = true }: LookProps) {
  const brand = brandOf(theme);
  const c = dark
    ? { bg: "#0c0f0d", ink: "#d7e0da", dim: "#6d7a72", hi: theme === "cat" ? "#ff8cc0" : "#5df2a0", bad: "#ff7a6b" }
    : { bg: "#f4f1e8", ink: "#1d201e", dim: "#7b7d77", hi: brand.base, bad: "#b3361f" };
  return (
    <div className="min-h-full px-4 pt-6 pb-10 font-mono text-[13px] leading-relaxed" style={{ background: c.bg, color: c.ink }}>
      <p style={{ color: c.dim }}>
        lifeos ~ $ today --{snapshot.dateLabel.split(" ")[0].toLowerCase()}
      </p>
      <h1 className="mt-1 text-[20px] font-semibold" style={{ color: c.hi }}>
        {snapshot.greeting}_
      </h1>
      <p style={{ color: c.dim }}>{snapshot.dateLabel}</p>
      <div className="mt-4 border-y py-1" style={{ borderColor: c.dim + "55" }}>
        {snapshot.sections.map((s) => (
          <Line key={s.kind} s={s} c={c} />
        ))}
      </div>
      <p className="mt-4" style={{ color: c.dim }}>
        # {snapshot.fact.text}
      </p>
    </div>
  );
}
