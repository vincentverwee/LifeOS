// Display helpers for Investments (pure).
import { formatCurrency } from "@/lib/format";

/** "+€ 12,30" / "−€ 4,00" (a real minus sign). */
export function formatSignedCurrency(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return formatCurrency(0);
  return `${rounded > 0 ? "+" : "−"}${formatCurrency(Math.abs(rounded))}`;
}

const pct = new Intl.NumberFormat("nl-BE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 0.0312 → "+3,1%"; null → "". */
export function formatSignedPct(share: number | null): string {
  if (share === null || !Number.isFinite(share)) return "";
  const v = Math.round(share * 1000) / 10;
  if (v === 0) return "0,0%";
  return `${v > 0 ? "+" : "−"}${pct.format(Math.abs(v))}%`;
}

const units = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 4 });

/** Units held: "12", "3,5", "0,1234". */
export function formatUnits(value: number): string {
  return units.format(value);
}

const price = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** A unit price keeps up to 4 decimals: "€ 133,3712". */
export function formatPrice(value: number): string {
  return price.format(value);
}

/**
 * A typed unit price: comma or dot, up to 4 decimals (Euronext quotes 3, stored closes
 * keep 4), above 0 and at most `max`. No thousands separators: "1.234,5" is null.
 */
export function parseUnitPrice(raw: unknown, max = 1_000_000): number | null {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!/^(\d+(\.\d{0,4})?|\.\d{1,4})$/.test(s)) return null;
  const n = Math.round(Number(s) * 10_000) / 10_000;
  return n > 0 && n <= max ? n : null;
}

/** Tailwind text colour for a gain: green up, red down, muted flat. */
export function gainClass(value: number): string {
  if (Math.abs(value) < 0.005) return "text-ink-muted";
  return value > 0 ? "text-positive-text" : "text-critical";
}

/** 0.0451 → "4,5%" (unsigned; `digits` decimals at most). */
export function formatPct(share: number, digits = 1): string {
  return `${(share * 100).toLocaleString("nl-BE", { maximumFractionDigits: digits })}%`;
}

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const monthOnly = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const dayMonthYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "2026-09" → "Sept 2026"; `short` → "Sept", or "Sept '26" with `short: "year"`. */
export function formatMonth(month: string, short?: boolean | "year"): string {
  const d = new Date(`${month.slice(0, 7)}-01T00:00:00Z`);
  if (short === "year") return `${monthOnly.format(d)} '${month.slice(2, 4)}`;
  return short ? monthOnly.format(d) : monthYear.format(d);
}

/** A day key: "13 Nov" in the current year, "13 Nov 2025" otherwise. */
export function formatDay(key: string, todayKey: string): string {
  const d = new Date(`${key.slice(0, 10)}T00:00:00Z`);
  return key.slice(0, 4) === todayKey.slice(0, 4) ? dayMonth.format(d) : dayMonthYear.format(d);
}

/** Chart axis label for a day: "13 Nov", or "Nov '25" when the chart spans more than ~11 months. */
export function chartDay(key: string, long: boolean): string {
  return long ? formatMonth(key, "year") : dayMonth.format(new Date(`${key.slice(0, 10)}T00:00:00Z`));
}

/** True when two day/month keys are more than ~11 months apart. */
export function spansYear(first: string | undefined, last: string | undefined): boolean {
  if (!first || !last) return false;
  const months = (Number(last.slice(0, 4)) - Number(first.slice(0, 4))) * 12 + Number(last.slice(5, 7)) - Number(first.slice(5, 7));
  return months > 11;
}
