import Link from "next/link";
import { Logo } from "@/components/Logo";
import { logoutAction } from "@/app/login/actions";

type NavItem = { href: string; label: string };

export function AppHeader({ nav = [], name }: { nav?: NavItem[]; name?: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-6">
          <Logo variant="light" href="/post-auth" />
          <nav className="hidden items-center gap-4 text-sm font-semibold text-muted md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-navy">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {name && <span className="hidden text-sm text-muted sm:inline">Hi, {name}</span>}
          <Link href="/support" className="text-sm font-semibold text-teal hover:underline">
            Support
          </Link>
          <form action={logoutAction}>
            <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-navy hover:bg-mint">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
