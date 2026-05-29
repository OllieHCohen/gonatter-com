import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NOT_A_CRISIS } from "@/lib/copy";

// The not-a-crisis notice (B2) must be reachable in all Caller areas.
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy text-white">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo variant="dark" href={null} />
            <p className="mt-3 text-sm text-white/70">
              Friendly conversation with real people, whenever you like. Not therapy,
              not a crisis line.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            <Link className="text-white/80 hover:text-white" href="/support">
              Support resources
            </Link>
            <Link className="text-white/80 hover:text-white" href="/how-it-works">
              How it works
            </Link>
            <Link className="text-white/80 hover:text-white" href="/safety">
              Safety
            </Link>
            <Link className="text-white/80 hover:text-white" href="/terms">
              Terms
            </Link>
            <Link className="text-white/80 hover:text-white" href="/become-a-listener">
              Become a Listener
            </Link>
            <Link className="text-white/80 hover:text-white" href="/privacy">
              Privacy
            </Link>
          </nav>
        </div>

        <div className="mt-8 rounded-xl bg-white/5 p-4 text-sm text-white/80">
          {NOT_A_CRISIS}{" "}
          <Link href="/support" className="font-semibold text-sunshine underline-offset-2 hover:underline">
            See support resources
          </Link>
        </div>

        <p className="mt-6 text-xs text-white/50">
          © {new Date().getFullYear()} gonatter. For adults 18+. English-language service.
        </p>
      </div>
    </footer>
  );
}
