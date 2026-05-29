import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { CallSetup } from "@/components/call/CallSetup";
import { CallRoom } from "@/components/call/CallRoom";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

type Params = { params: Promise<{ conversationId: string }> };

export default async function CallPage({ params }: Params) {
  const { conversationId } = await params;
  const { userId } = await requireUser();
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, caller_id, listener_id, state, caller:profiles!conversations_caller_id_fkey(display_name), listener:profiles!conversations_listener_id_fkey(display_name)",
    )
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) notFound();
  const c = conv as unknown as {
    id: string;
    caller_id: string;
    listener_id: string;
    state: string;
    caller: { display_name: string } | null;
    listener: { display_name: string } | null;
  };
  if (c.state !== "accepted") redirect(`/messages/${conversationId}`);

  const isCaller = c.caller_id === userId;
  const otherName = (isCaller ? c.listener?.display_name : c.caller?.display_name) ?? "Someone";

  // Is there a live call session for this conversation already?
  const { data: cs } = await supabase
    .from("call_sessions")
    .select("id, caller_id, state")
    .eq("conversation_id", conversationId)
    .in("state", ["authorising", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cs) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <CallRoom
          callSessionId={cs.id}
          conversationId={conversationId}
          role={isCaller ? "caller" : "listener"}
          otherName={otherName}
          otherId={isCaller ? c.listener_id : c.caller_id}
        />
      </main>
    );
  }

  if (!isCaller) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-16">
        <Card className="space-y-4 text-center">
          <h1 className="font-display text-xl font-bold text-navy">Waiting for {otherName}</h1>
          <p className="text-muted">
            They&apos;ll start the call when ready. Keep this page open — it will connect you
            automatically.
          </p>
          <ButtonLink href={`/messages/${conversationId}`} variant="secondary">
            Back to messages
          </ButtonLink>
        </Card>
      </main>
    );
  }

  const { data: lp } = await supabase
    .from("listener_profiles")
    .select("per_minute_rate_minor, rate_currency")
    .eq("profile_id", c.listener_id)
    .single();

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-10">
      <CallSetup
        conversationId={conversationId}
        listenerName={otherName}
        rateMinor={lp?.per_minute_rate_minor ?? 0}
        currency={lp?.rate_currency ?? "gbp"}
      />
    </main>
  );
}
