import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { MobileNav } from "@/components/MobileNav";
import { getSessionProfile, homePathForRole } from "@/lib/auth";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety" },
  { href: "/become-a-listener", label: "For listeners" },
];

export async function SiteHeader() {
  const session = await getSessionProfile();
  const profile = session?.profile ?? null;

  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Logo variant="light" size="lg" priority />
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-semibold text-navy hover:text-teal">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {profile ? (
            <ButtonLink href={homePathForRole(profile.role)} variant="primary" size="md">
              Open gonatter
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="md" className="hidden sm:inline-flex">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" variant="primary" size="md">
                Talk to someone
              </ButtonLink>
            </>
          )}
          <MobileNav links={profile ? NAV : [...NAV, { href: "/login", label: "Log in" }]} />
        </div>
      </div>
    </header>
  );
}
