// Format integer minor units as a localised currency string.
export function formatMoney(minor: number, currency: string, locale = "en-GB"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(minor / 100);
}

// Per-minute rate label, e.g. "50p/min" or "£1.20/min".
export function formatRate(minor: number, currency: string, locale = "en-GB"): string {
  if (currency.toLowerCase() === "gbp" && minor < 100) return `${minor}p/min`;
  return `${formatMoney(minor, currency, locale)}/min`;
}
