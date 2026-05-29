import { requireRole } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

const NAV = [{ href: "/admin", label: "Reports" }];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("admin");
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader nav={NAV} name={profile.display_name} />
      <main className="mx-auto w-full max-w-4xl px-5 py-8">{children}</main>
    </div>
  );
}
