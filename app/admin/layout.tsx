import { requireAdmin } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

const NAV = [
  { href: "/admin", label: "Reports" },
  { href: "/admin/bugs", label: "Bug reports" },
  { href: "/admin/admins", label: "Admins" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader nav={NAV} name={profile.display_name} />
      <main className="mx-auto w-full max-w-4xl px-5 py-8">{children}</main>
    </div>
  );
}
