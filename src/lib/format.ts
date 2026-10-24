const currencyFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "short",
});

const percentFormatter = new Intl.NumberFormat("nl-BE", {
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

/**
 * Parses a typed amount. Accepts comma decimals and simple sums such as
 * "6,8+7,4" (like adding several purchases in one spreadsheet cell).
 * Returns null when the input isn't a valid non-negative number/sum.
 */
export function parseAmount(raw: string): number | null {
  const parts = raw.trim().replace(/\s+/g, "").replace(/,/g, ".").split("+");
  if (parts.some((part) => !/^(\d+\.?\d*|\.\d+)$/.test(part))) return null;
  const total = parts.reduce((sum, part) => sum + Number.parseFloat(part), 0);
  return Math.round(total * 100) / 100;
}

/** "YYYY-MM-DD" in the user's local timezone (for <input type="date">). */
export function toDateInputValue(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Date-only ISO string -> "YYYY-MM-DD" (the @db.Date columns are UTC midnight). */
export function dayKey(value: string | Date): string {
  return (typeof value === "string" ? value : value.toISOString()).slice(0, 10);
}

/** Like parseAmount but allows a leading "-" (balances can be negative). */
export function parseSignedAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("-")) {
    const value = parseAmount(trimmed.slice(1));
    return value === null ? null : -value;
  }
  return parseAmount(trimmed);
}

const compactCurrencyFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Short axis labels for narrow charts, e.g. "€ 1,2K". */
export function formatCurrencyCompact(value: number): string {
  return compactCurrencyFormatter.format(value);
}

const wholeCurrencyFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** Big amounts without cents so they fit small cards: "€ 1.047" (cents kept below € 1.000). */
export function formatCurrencyShort(value: number): string {
  return Math.abs(value) >= 1000 ? wholeCurrencyFormatter.format(value) : formatCurrency(value);
}
