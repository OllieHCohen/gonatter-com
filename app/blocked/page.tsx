import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { UnblockButton } from "@/components/UnblockButton";

type BlockRow = {
  blocked_id: string;
  created_at: string;
  blocked: { display_name: string } | null;
};

export default async function BlockedPage() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id, created_at, blocked:profiles!blocks_blocked_id_fkey(display_name)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as BlockRow[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/messages" className="text-sm text-muted hover:text-navy">
          ← Messages
        </Link>
        <h1 className="font-display text-3xl font-bold text-navy">Blocked people</h1>
        <p className="mt-2 text-muted">
          People you&apos;ve blocked can&apos;t message or call you, and you can&apos;t contact
          them. Unblock someone at any time to allow contact again.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-muted">
            You haven&apos;t blocked anyone. If someone ever makes you uncomfortable, you can
            block them from your conversation with them — and report them, too.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.blocked_id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-navy">{r.blocked?.display_name ?? "Someone"}</p>
                  <p className="text-xs text-muted">
                    Blocked {new Date(r.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <UnblockButton otherId={r.blocked_id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
