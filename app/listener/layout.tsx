import { requireRole, isAdmin } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { IncomingCallBanner } from "@/components/listener/IncomingCallBanner";
import { NewMessageBanner } from "@/components/NewMessageBanner";

const NAV = [
  { href: "/listener", label: "Dashboard" },
  { href: "/messages", label: "Messages" },
  { href: "/listener/onboarding", label: "My profile" },
];

export default async function ListenerLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await requireRole("listener");
  const nav = isAdmin(profile) ? [...NAV, { href: "/admin", label: "Admin" }] : NAV;
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <IncomingCallBanner userId={userId} />
      <NewMessageBanner userId={userId} />
      <AppHeader nav={nav} name={profile.display_name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
