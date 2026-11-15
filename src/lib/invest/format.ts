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

/** Tailwind text colour for a gain: green up, red down, muted flat. */
export function gainClass(value: number): string {
  if (Math.abs(value) < 0.005) return "text-ink-muted";
  return value > 0 ? "text-positive-text" : "text-critical";
}
