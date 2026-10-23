// Minimal country list for signup + discovery filters (ISO 3166-1 alpha-2).
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "gb", name: "United Kingdom" },
  { code: "ie", name: "Ireland" },
  { code: "us", name: "United States" },
  { code: "ca", name: "Canada" },
  { code: "au", name: "Australia" },
  { code: "nz", name: "New Zealand" },
  { code: "za", name: "South Africa" },
  { code: "in", name: "India" },
  { code: "fr", name: "France" },
  { code: "de", name: "Germany" },
  { code: "es", name: "Spain" },
  { code: "it", name: "Italy" },
  { code: "nl", name: "Netherlands" },
  { code: "se", name: "Sweden" },
  { code: "no", name: "Norway" },
  { code: "dk", name: "Denmark" },
  { code: "pl", name: "Poland" },
  { code: "pt", name: "Portugal" },
];

export function countryName(code: string | null | undefined): string {
  if (!code) return "—";
  return COUNTRIES.find((c) => c.code === code.toLowerCase())?.name ?? code.toUpperCase();
}

// Calling codes for the countries above. Phone verification texts only go to
// these, which blocks SMS-pumping fraud aimed at premium-rate destinations.
// Keep in sync with COUNTRIES (+1 covers the US and Canada).
const SMS_DIAL_CODES = [
  "44", "353", "1", "61", "64", "27", "91", "33", "49",
  "34", "39", "31", "46", "47", "45", "48", "351",
];

export function smsAllowed(phoneE164: string): boolean {
  return SMS_DIAL_CODES.some((code) => phoneE164.startsWith(`+${code}`));
}
