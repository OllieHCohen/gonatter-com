import { requireRole } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/messages", label: "Messages" },
];

export default async function DiscoverLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("caller");
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <AppHeader nav={NAV} name={profile.display_name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
