import type { Metadata } from "next";
import { Poppins, Nunito, Source_Serif_4, Lato } from "next/font/google";
import { BugReportWidget } from "@/components/BugReportWidget";
import "./globals.css";

// Headings: rounded, friendly-but-grown-up sans (Brand §5).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Body: highly legible humanist sans, gentle weight contrast.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

// 2026 brand refresh: serif display + clean sans body (Brand Walkthrough).
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const lato = Lato({
  variable: "--font-lato-sans",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "gonatter — real people, real conversations",
  description:
    "gonatter connects you with real humans who'll listen. Friendly conversation, whenever you like — not therapy, not a crisis line.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${nunito.variable} ${sourceSerif.variable} ${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <BugReportWidget />
      </body>
    </html>
  );
}
