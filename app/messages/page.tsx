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

type MsgRow = {
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const STATE_LABEL: Record<string, string> = {
  open: "Awaiting reply",
  accepted: "Accepted",
  declined: "Declined",
  closed: "Closed",
};

// UK-style compact timestamp: time for today, else DD/MM/YYYY.
function when(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-GB");
}

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

  // Latest message per conversation for the preview line.
  const lastByConv = new Map<string, MsgRow>();
  if (convs.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, sender_id, body, created_at")
      .in(
        "conversation_id",
        convs.map((c) => c.id),
      )
      .order("created_at", { ascending: false })
      .limit(200);
    for (const m of (msgs ?? []) as MsgRow[]) {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
    }
  }

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
            const last = lastByConv.get(c.id);
            const preview = last
              ? `${last.sender_id === userId ? "You: " : ""}${last.body}`
              : null;
            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="block">
                <Card className="transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-navy">{otherName ?? "Someone"}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted">{when(last?.created_at ?? c.updated_at)}</span>
                      <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-navy">
                        {STATE_LABEL[c.state] ?? c.state}
                      </span>
                    </span>
                  </div>
                  {preview && (
                    <p className="mt-1 truncate text-sm text-muted">{preview}</p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
