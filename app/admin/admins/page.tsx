import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { GrantAdminForm } from "@/components/admin/GrantAdminForm";
import { RevokeAdminButton } from "@/components/admin/RevokeAdminButton";

type AdminRow = { id: string; display_name: string; role: string };

export default async function AdminAdmins() {
  const { userId } = await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, display_name, role, is_admin")
    .or("is_admin.eq.true,role.eq.admin")
    .order("display_name");

  const admins = (data ?? []) as AdminRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Admins</h1>
        <p className="mt-1 text-muted">
          Admins can review user reports and bug reports. Grant access by email.
        </p>
      </div>

      <Card>
        <GrantAdminForm />
      </Card>

      <div className="space-y-3">
        {admins.map((a) => (
          <Card key={a.id} className="flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-navy">{a.display_name}</span>
              <span className="ml-3 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-navy">
                {a.role}
              </span>
            </div>
            {a.id === userId ? (
              <span className="text-sm text-muted">you</span>
            ) : (
              <RevokeAdminButton profileId={a.id} name={a.display_name} />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
