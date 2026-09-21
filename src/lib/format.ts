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
