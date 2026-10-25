const currencyFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
});

// Every date we format is date-only (UTC midnight), so format in UTC to
// never show the day before in timezones west of Greenwich.
const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
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

const hoursFormatter = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 2 });

/** "3,5 h" */
export function formatHours(value: number): string {
  return `${hoursFormatter.format(value)} h`;
}

/**
 * Parses typed study time into hours: "1,5", "1,5+2", "1:30", "90m", "1h30".
 * Returns null when the input isn't valid.
 */
export function parseHours(raw: string): number | null {
  const parts = raw.trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, ".").split("+");
  let total = 0;
  for (const part of parts) {
    let match: RegExpMatchArray | null;
    if ((match = part.match(/^(\d+):(\d{1,2})$/))) {
      total += Number(match[1]) + Number(match[2]) / 60;
    } else if ((match = part.match(/^(\d+(?:\.\d+)?)m(?:in)?$/))) {
      total += Number(match[1]) / 60;
    } else if ((match = part.match(/^(\d+)[hu](\d{1,2})m?$/))) {
      total += Number(match[1]) + Number(match[2]) / 60;
    } else if ((match = part.match(/^(\d+\.?\d*|\.\d+)[hu]?$/))) {
      total += Number.parseFloat(match[1]);
    } else {
      return null;
    }
  }
  return Math.round(total * 100) / 100;
}
