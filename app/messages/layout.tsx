import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  const nav =
    profile?.role === "listener"
      ? [
          { href: "/listener", label: "Dashboard" },
          { href: "/messages", label: "Messages" },
        ]
      : [
          { href: "/discover", label: "Discover" },
          { href: "/messages", label: "Messages" },
        ];
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <AppHeader nav={nav} name={profile?.display_name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
