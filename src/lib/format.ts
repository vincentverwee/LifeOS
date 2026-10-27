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

/** Largest amount any input accepts (the columns are Decimal(12, 2)). */
export const MAX_AMOUNT = 1_000_000;

/** Normalises typed operators: "×", "x", "*" → "*"; "÷", "/" → "/"; "−" → "-". */
function normalizeExpression(raw: string): string {
  return raw
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[×xX]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-");
}

/** True when an amount is a calculation (an operator after the first character). */
export function hasOperator(raw: string): boolean {
  return /[+\-*/]/.test(normalizeExpression(raw).slice(1));
}

/**
 * Evaluates a typed calculation like "6,8+7,4" or "12,50×3-2/4" (× and ÷ before
 * + and −, like a calculator). Comma decimals; at most two decimals per number,
 * so "1.234" (a Belgian thousands separator) is rejected instead of silently
 * becoming 1,23. One trailing operator is ignored ("12+" = 12) so a half-typed
 * calculation still shows its total. A leading "-" is allowed.
 * Returns the result rounded to cents, or null when the input isn't valid.
 */
export function evaluateAmount(raw: string): number | null {
  let expr = normalizeExpression(raw);
  if (/[+\-*/]$/.test(expr) && expr.length > 1) expr = expr.slice(0, -1);
  const negative = expr.startsWith("-");
  if (negative) expr = expr.slice(1);
  const tokens = expr.split(/([+\-*/])/);
  // Numbers sit at even indexes, operators at odd ones.
  const numbers: number[] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(tokens[i])) return null;
    numbers.push(Number.parseFloat(tokens[i]));
  }
  if (negative) numbers[0] = -numbers[0];
  // × and ÷ first: fold them into terms, then add the terms up.
  const terms = [numbers[0]];
  const signs = [1];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const value = numbers[(i + 1) / 2];
    if (op === "*") terms[terms.length - 1] *= value;
    else if (op === "/") {
      if (value === 0) return null;
      terms[terms.length - 1] /= value;
    } else {
      terms.push(value);
      signs.push(op === "-" ? -1 : 1);
    }
  }
  // Sum in cents so 0.1 + 0.2 stays 0.30.
  const cents = terms.reduce((sum, term, i) => sum + signs[i] * Math.round(term * 100), 0);
  return Number.isFinite(cents) ? cents / 100 : null;
}

/**
 * Parses a typed amount or calculation (see evaluateAmount).
 * Returns null when the input isn't valid, the result is negative, or above MAX_AMOUNT.
 */
export function parseAmount(raw: string): number | null {
  const value = evaluateAmount(raw);
  if (value === null || value < 0 || value > MAX_AMOUNT) return null;
  return value;
}

/**
 * Validates a "YYYY-MM-DD" date key. Returns null for anything else, including
 * impossible dates like "2026-02-31" that `new Date` would silently roll over.
 */
export function parseDateKey(raw: unknown): string | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === raw ? raw : null;
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
  const value = evaluateAmount(raw);
  if (value === null || Math.abs(value) > MAX_AMOUNT) return null;
  return value;
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
