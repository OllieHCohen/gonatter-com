import { requireUser, isAdmin } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { IncomingCallBanner } from "@/components/listener/IncomingCallBanner";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await requireUser();
  const isListener = profile?.role === "listener";
  const nav = isListener
    ? [
        { href: "/listener", label: "Dashboard" },
        { href: "/messages", label: "Messages" },
        { href: "/listener/onboarding", label: "My profile" },
      ]
    : [
        { href: "/discover", label: "Discover" },
        { href: "/messages", label: "Messages" },
        { href: "/credit", label: "Credit" },
      ];
  if (isAdmin(profile)) nav.push({ href: "/admin", label: "Admin" });
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {isListener && <IncomingCallBanner userId={userId} />}
      <AppHeader nav={nav} name={profile?.display_name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
