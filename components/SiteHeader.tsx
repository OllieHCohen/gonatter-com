import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Logo variant="light" priority />
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="md">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" variant="primary" size="md">
            Get started
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
