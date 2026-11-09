import Link from "next/link";
import { Mascot } from "@/components/icons/Mascot";
import type { DaySlot, SectionSummary } from "@/lib/data/homeSnapshot";
import type { Theme } from "@/lib/theme";
import { brandOf, isLong, mascotOf, toneColor, type LookProps } from "./shared";

/** Sky, sun and hills per time of day: stands in until a real photo sits in public/hero/. */
const SKY: Record<DaySlot, { sky: [string, string, string]; sun: string; sunY: number; hills: [string, string, string]; mist: string }> = {
  dawn: { sky: ["#232b36", "#6b5a5a", "#e3a06a"], sun: "#ffd39a", sunY: 150, hills: ["#3a4434", "#26301f", "#151b12"], mist: "rgba(230,215,200,0.35)" },
  day: { sky: ["#6d9fc4", "#a9c9de", "#e4eef2"], sun: "#fff8e0", sunY: 70, hills: ["#7d9a6a", "#557548", "#2f4a29"], mist: "rgba(255,255,255,0.35)" },
  dusk: { sky: ["#241d38", "#7a4a5e", "#e88a5a"], sun: "#ffb27a", sunY: 160, hills: ["#3b3540", "#24222b", "#141317"], mist: "rgba(240,190,170,0.25)" },
  night: { sky: ["#070a14", "#121a2c", "#1e2a3c"], sun: "#e8ecf5", sunY: 60, hills: ["#1a2420", "#111915", "#0a0f0c"], mist: "rgba(160,180,210,0.12)" },
};

function PaintedHero({ slot }: { slot: DaySlot }) {
  const c = SKY[slot];
  return (
    <svg aria-hidden="true" viewBox="0 0 390 320" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="bg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.sky[0]} />
          <stop offset="0.6" stopColor={c.sky[1]} />
          <stop offset="1" stopColor={c.sky[2]} />
        </linearGradient>
        <radialGradient id="bg-sun">
          <stop offset="0" stopColor={c.sun} stopOpacity="1" />
          <stop offset="0.25" stopColor={c.sun} stopOpacity="0.6" />
          <stop offset="1" stopColor={c.sun} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="390" height="320" fill="url(#bg-sky)" />
      {slot === "night" &&
        [30, 80, 140, 210, 260, 330, 360, 110, 300].map((x, i) => <circle key={i} cx={x} cy={20 + ((i * 37) % 90)} r={i % 3 === 0 ? 1.2 : 0.7} fill="#fff" opacity="0.7" />)}
      <circle cx="300" cy={c.sunY} r="90" fill="url(#bg-sun)" />
      <circle cx="300" cy={c.sunY} r={slot === "night" ? 9 : 12} fill={c.sun} />
      <path d="M0 210 C 60 170, 120 160, 190 185 S 320 150, 390 175 V320 H0Z" fill={c.hills[0]} />
      <rect y="190" width="390" height="40" fill={c.mist} />
      <path d="M0 245 C 80 210, 150 225, 230 215 S 340 200, 390 225 V320 H0Z" fill={c.hills[1]} />
      <path d="M0 285 C 100 255, 200 270, 260 262 S 360 255, 390 270 V320 H0Z" fill={c.hills[2]} />
    </svg>
  );
}

/** A section's mascot as a line mark: outline in the accent, wool the same solid colour as its circle. */
function Badge({ kind, color, ring }: { kind: SectionSummary["kind"]; color: string; ring: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: ring, color, ["--color-wool" as string]: ring }}>
      <Mascot kind={kind} size={36} decorative />
    </span>
  );
}

type Look = { photo: number; fade: string; ink: string; muted: string; glass: string; border: string; ring: string; accent: string; track: string; shadow: string; dark: boolean };

function Visual({ s, l }: { s: SectionSummary; l: Look }) {
  if (s.spark) {
    const top = Math.max(1, ...s.spark);
    return (
      <span aria-hidden="true" className="mt-3 flex h-7 items-end gap-1">
        {s.spark.map((v, i) => (
          <span key={i} className="flex h-full flex-1 items-end rounded-md" style={{ background: l.track }}>
            <span className="w-full rounded-md" style={{ height: `${(v / top) * 100}%`, background: l.accent }} />
          </span>
        ))}
      </span>
    );
  }
  if (s.progress !== undefined) {
    return (
      <span aria-hidden="true" className="relative mt-4 block h-2 w-full rounded-full" style={{ background: l.track }}>
        <span className="block h-full rounded-full" style={{ width: `${s.progress * 100}%`, background: s.tone === "bad" ? toneColor("bad", l.dark) : l.accent }} />
        {s.marker !== undefined && (
          <span className="absolute -top-1 h-4 w-0.5 rounded-full" style={{ left: `calc(${s.marker * 100}% - 1px)`, background: l.ink, opacity: 0.5 }} />
        )}
      </span>
    );
  }
  return null;
}

function Title({ s, theme, muted }: { s: SectionSummary; theme: Theme; muted: string }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate text-[17px] leading-tight font-semibold">{s.name}</span>
      <span className="block truncate text-[13px]" style={{ color: muted }}>
        {mascotOf(s.kind, theme)}
      </span>
    </span>
  );
}

function Card({ s, l, theme, wide }: { s: SectionSummary; l: Look; theme: Theme; wide: boolean }) {
  const sentence = isLong(s);
  return (
    <Link
      href={s.href}
      className={`relative flex min-h-[200px] min-w-0 flex-col overflow-hidden rounded-[28px] border p-4 backdrop-blur-xl transition-transform active:scale-[0.98] ${
        wide ? "col-span-2" : ""
      }`}
      style={{ background: l.glass, borderColor: l.border, boxShadow: l.shadow, color: l.ink }}
    >
      {s.backdrop && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a local stock photo, faint behind the glass */}
          <img src={s.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: l.photo, filter: "saturate(0.85)" }} />
          {/* fades the photo out towards the text at the bottom */}
          <span aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent, ${l.fade} 75%)` }} />
        </>
      )}
      <span className={`relative flex gap-3 ${wide ? "items-center" : "items-start"}`}>
        <Badge kind={s.kind} color={l.accent} ring={l.ring} />
        {wide && <Title s={s} theme={theme} muted={l.muted} />}
        <span aria-hidden="true" className="ml-auto text-[20px] leading-none" style={{ color: l.muted }}>
          ›
        </span>
      </span>
      {!wide && (
        <span className="relative mt-2">
          <Title s={s} theme={theme} muted={l.muted} />
        </span>
      )}
      <span className="relative mt-auto pt-4">
        {sentence ? (
          <span className="line-clamp-3 block font-[family-name:var(--font-fraunces)] text-[20px] leading-snug">{s.value}</span>
        ) : (
          <span
            className={`block truncate leading-none font-semibold tracking-tight whitespace-nowrap tabular-nums ${
              wide ? "text-[44px]" : s.value.length > 4 ? "text-[26px]" : "text-[32px]"
            }`}
          >
            {s.value}
            {s.unit && (
              <span className="ml-1.5 text-[15px] font-medium" style={{ color: l.muted }}>
                {s.unit}
              </span>
            )}
          </span>
        )}
        {s.sub && (
          <span className="mt-1.5 block truncate text-[13px] font-medium" style={{ color: toneColor(s.tone, l.dark) ?? l.muted }}>
            {s.tone === "good" ? "▲ " : s.tone === "bad" ? "● " : ""}
            {s.sub}
          </span>
        )}
        {s.detail && (
          <span className="mt-2.5 block truncate border-t pt-2.5 text-[13px]" style={{ borderColor: l.border, color: l.muted }}>
            {s.detail}
          </span>
        )}
        <Visual s={s} l={l} />
      </span>
    </Link>
  );
}

/**
 * Bento + glass: a landscape hero for the time of day (a real photo from public/hero/ when there is one)
 * with the greeting and fact on it, then frosted cards in a bento grid: Budget wide on top,
 * the diary wide, each tile with a faint stock photo behind it (public/photos/<kind>.jpg) when there is one.
 * Mascots stay, drawn as thin line marks.
 */
export function BentoGlassLook({ snapshot, theme, dark = true }: LookProps) {
  const brand = brandOf(theme);
  const l: Look = dark
    ? {
        photo: 0.32,
        fade: "rgba(13,17,14,0.92)",
        ink: "#f1f3ef",
        muted: "rgba(225,232,224,0.62)",
        glass: "rgba(255,255,255,0.055)",
        border: "rgba(255,255,255,0.09)",
        ring: "#1b221d",
        accent: brand.bright,
        track: "rgba(255,255,255,0.08)",
        shadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        dark,
      }
    : {
        photo: 0.28,
        fade: "rgba(244,247,243,0.94)",
        ink: "#18211b",
        muted: "rgba(24,33,27,0.6)",
        glass: "rgba(255,255,255,0.7)",
        border: "rgba(255,255,255,0.95)",
        ring: brand.tint,
        accent: brand.base,
        track: "rgba(0,0,0,0.06)",
        shadow: "0 10px 30px rgba(20,40,25,0.08)",
        dark,
      };
  const page = dark ? "#0d110e" : "#e8ede6";
  const [budget, ...rest] = snapshot.sections;
  const diary = rest.filter(isLong);
  const tiles = rest.filter((s) => !isLong(s));
  const cells = [
    ...tiles.map((s, i) => ({ s, wide: tiles.length % 2 === 1 && i === tiles.length - 1 })),
    ...diary.map((s) => ({ s, wide: true })),
  ];
  return (
    <div className="relative min-h-full pb-10" style={{ background: page, color: l.ink }}>
      <header className="relative h-[330px] overflow-hidden">
        {snapshot.hero ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local hero photo
          <img src={snapshot.hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <PaintedHero slot={snapshot.slot} />
        )}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.05) 40%, ${page})` }} />
        <div className="relative flex h-full flex-col justify-end px-6 pb-14 text-white">
          <p className="text-[14px] opacity-85">{snapshot.dateLabel}</p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-[40px] leading-tight font-medium tracking-tight">{snapshot.greeting}</h1>
          <p className="mt-1 max-w-[30ch] text-[14px] leading-snug italic opacity-85">{snapshot.fact.text}</p>
          <span aria-hidden="true" className="mt-3 h-[3px] w-12 rounded-full" style={{ background: brand.bright }} />
        </div>
      </header>
      <div className="relative -mt-8 grid grid-cols-2 gap-3 px-4">
        <Card s={budget} l={l} theme={theme} wide />
        {cells.map(({ s, wide }) => (
          <Card key={s.kind} s={s} l={l} theme={theme} wide={wide} />
        ))}
      </div>
    </div>
  );
}
