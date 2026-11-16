const formatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

export function parseEuroInput(input: string): number | null {
  const normalized = input.trim().replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(parseFloat(normalized) * 100);
}

/** Karma is money-denominated; always show the sign so + and − read at a glance. */
export function formatKarma(cents: number): string {
  const rounded = Math.round(cents);
  const text = formatter.format(Math.abs(rounded) / 100);
  if (rounded > 0) return `+${text}`;
  if (rounded < 0) return `−${text}`;
  return text;
}
