import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { BugRow } from "@/components/admin/BugRow";
import type { BugReport } from "@/lib/types";

type BugWithReporter = BugReport & { reporter: { display_name: string } | null };

const STATUS_ORDER: Record<string, number> = { new: 0, in_progress: 1, resolved: 2, dismissed: 3 };

export default async function AdminBugs() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("bug_reports")
    .select("*, reporter:profiles!bug_reports_reporter_id_fkey(display_name)")
    .order("created_at", { ascending: false });

  const bugs = ((data ?? []) as unknown as BugWithReporter[]).sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
  );
  const openCount = bugs.filter((b) => b.status === "new" || b.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Bug reports</h1>
        <p className="mt-1 text-muted">{openCount} open</p>
      </div>

      {bugs.length === 0 ? (
        <Card>
          <p className="text-muted">No bug reports. Smooth sailing.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {bugs.map((b) => (
            <BugRow key={b.id} bug={b} />
          ))}
        </div>
      )}
    </div>
  );
}
