import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

type ConvRow = {
  id: string;
  caller_id: string;
  listener_id: string;
  state: string;
  updated_at: string;
  caller: { display_name: string } | null;
  listener: { display_name: string } | null;
};

const STATE_LABEL: Record<string, string> = {
  open: "Awaiting reply",
  accepted: "Accepted",
  declined: "Declined",
  closed: "Closed",
};

export default async function MessagesList() {
  const { userId, profile } = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, caller_id, listener_id, state, updated_at, caller:profiles!conversations_caller_id_fkey(display_name), listener:profiles!conversations_listener_id_fkey(display_name)",
    )
    .order("updated_at", { ascending: false });

  const convs = (data ?? []) as unknown as ConvRow[];
  const isListener = profile?.role === "listener";

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-navy">Messages</h1>

      {convs.length === 0 ? (
        <Card>
          <p className="text-muted">
            No conversations yet.{" "}
            {isListener
              ? "When a caller reaches out, you'll see it here."
              : "Find someone to talk to and say hi."}
          </p>
          {!isListener && (
            <ButtonLink href="/discover" className="mt-4">
              Discover listeners
            </ButtonLink>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {convs.map((c) => {
            const otherName = c.caller_id === userId ? c.listener?.display_name : c.caller?.display_name;
            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="block">
                <Card className="flex items-center justify-between gap-4 transition-shadow hover:shadow-md">
                  <span className="font-semibold text-navy">{otherName ?? "Someone"}</span>
                  <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-navy">
                    {STATE_LABEL[c.state] ?? c.state}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
