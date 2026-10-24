import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MobileNav } from "@/components/MobileNav";
import { getSessionProfile, homePathForRole } from "@/lib/auth";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/safety", label: "Safety" },
  { href: "/become-a-listener", label: "Become a Natterer" },
];

// No display class here, so callers can hide a pill on small screens.
const pill =
  "min-h-11 items-center whitespace-nowrap rounded-full px-4 font-brand sm:px-5 text-[0.9rem] font-bold transition-colors";

export async function SiteHeader() {
  const session = await getSessionProfile();
  const profile = session?.profile ?? null;

  return (
    <header className="sticky top-0 z-30 border-b border-gn-line bg-gn-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5">
        <Logo variant="light" size="lg" priority className="max-sm:[&_span]:text-2xl" />
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
            <Link href={homePathForRole(profile.role)} className={`${pill} inline-flex bg-gn-navy text-white hover:bg-gn-navy-700`}>
              Open gonatter
            </Link>
          ) : (
            <>
              <Link href="/login" className={`${pill} hidden text-gn-navy hover:bg-gn-mist sm:inline-flex`}>
                Log in
              </Link>
              <Link href="/signup" className={`${pill} inline-flex bg-gn-navy text-white hover:bg-gn-navy-700`}>
                Find someone<span className="hidden sm:inline">&nbsp;to talk to</span>
              </Link>
            </>
          )}
          <MobileNav links={profile ? NAV : [...NAV, { href: "/login", label: "Log in" }]} />
        </div>
      </div>
    </header>
  );
}
