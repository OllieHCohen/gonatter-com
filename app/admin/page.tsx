import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { ReportRow } from "@/components/admin/ReportRow";

export type AdminReport = {
  id: string;
  category: string;
  body: string | null;
  state: string;
  resolution: string | null;
  created_at: string;
  reporter: { display_name: string } | null;
  subject: { display_name: string } | null;
};

const STATE_ORDER: Record<string, number> = { open: 0, reviewing: 1, resolved: 2, dismissed: 3 };

export default async function AdminReports() {
  await requireRole("admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("reports")
    .select(
      "id, category, body, state, resolution, created_at, reporter:profiles!reports_reporter_id_fkey(display_name), subject:profiles!reports_subject_id_fkey(display_name)",
    )
    .order("created_at", { ascending: false });

  const reports = ((data ?? []) as unknown as AdminReport[]).sort(
    (a, b) => (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9),
  );
  const openCount = reports.filter((r) => r.state === "open").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Reports</h1>
        <p className="mt-1 text-muted">{openCount} open</p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <p className="text-muted">No reports. All quiet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
