import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MobileNav } from "@/components/MobileNav";
import { getSessionProfile, homePathForRole } from "@/lib/auth";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety" },
  { href: "/become-a-listener", label: "Become a Natterer" },
];

const pill =
  "inline-flex min-h-11 items-center rounded-full px-5 font-brand text-[0.9rem] font-bold transition-colors";

export async function SiteHeader() {
  const session = await getSessionProfile();
  const profile = session?.profile ?? null;

  return (
    <header className="sticky top-0 z-30 border-b border-gn-line bg-gn-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Logo variant="light" size="lg" priority />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-brand text-[0.9rem] font-bold text-gn-navy hover:text-gn-coral-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {profile ? (
            <Link href={homePathForRole(profile.role)} className={`${pill} bg-gn-navy text-white hover:bg-gn-navy-700`}>
              Open gonatter
            </Link>
          ) : (
            <>
              <Link href="/login" className={`${pill} hidden text-gn-navy hover:bg-gn-mist sm:inline-flex`}>
                Log in
              </Link>
              <Link href="/signup" className={`${pill} bg-gn-navy text-white hover:bg-gn-navy-700`}>
                Find someone to talk to
              </Link>
            </>
          )}
          <MobileNav links={profile ? NAV : [...NAV, { href: "/login", label: "Log in" }]} />
        </div>
      </div>
    </header>
  );
}
