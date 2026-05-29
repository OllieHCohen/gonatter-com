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
