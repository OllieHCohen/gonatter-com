import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NOT_A_CRISIS } from "@/lib/copy";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety" },
  { href: "/become-a-listener", label: "Become a Natterer" },
  { href: "/support", label: "Support resources" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

// The not-a-crisis notice (B2) must be reachable in all Caller areas.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gn-line bg-white font-brand text-gn-navy">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <Logo variant="light" href={null} />
            <p className="mt-3 text-[0.95rem] leading-relaxed text-gn-muted">
              Does this make it easier for two strangers to have a brilliant conversation?
              That&apos;s the test for everything we build.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2.5 text-[0.95rem] font-bold">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-gn-coral-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 rounded-2xl border border-gn-line bg-gn-mist p-5 text-[0.95rem] text-gn-body">
          {NOT_A_CRISIS}{" "}
          <Link href="/support" className="font-bold text-gn-navy underline underline-offset-2 hover:text-gn-coral-ink">
            See support resources
          </Link>
        </div>

        <p className="mt-6 text-sm text-gn-muted">
          © {new Date().getFullYear()} gonatter. For adults 18+. English-language service.
        </p>
      </div>
    </footer>
  );
}
