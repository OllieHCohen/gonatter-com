import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { CallSetup } from "@/components/call/CallSetup";
import { CallRoom } from "@/components/call/CallRoom";
import { ConversationHelp } from "@/components/call/ConversationHelp";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { VoiceBackdrop } from "@/components/VoiceBackdrop";

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

  // Context about the other person (bio, photo, topics where they exist) plus
  // AI conversation starters — for BOTH parties, before and during the call.
  let help: React.ReactNode;
  if (isCaller) {
    const [{ data: helpLp }, { data: li }] = await Promise.all([
      supabase
        .from("listener_profiles")
        .select("bio, photo_url")
        .eq("profile_id", c.listener_id)
        .maybeSingle(),
      supabase.from("listener_interests").select("interests(label)").eq("listener_id", c.listener_id),
    ]);
    const topics = ((li ?? []) as unknown as { interests: { label: string } | null }[])
      .map((r) => r.interests?.label)
      .filter((l): l is string => Boolean(l));
    help = (
      <ConversationHelp
        conversationId={conversationId}
        name={otherName}
        bio={(helpLp?.bio as string | null) ?? null}
        photoUrl={(helpLp?.photo_url as string | null) ?? null}
        topics={topics}
      />
    );
  } else {
    // Callers have thin profiles — the starters action fills the gap with
    // warm general openers when there's little to go on.
    help = (
      <ConversationHelp
        conversationId={conversationId}
        name={otherName}
        bio={null}
        photoUrl={null}
        topics={[]}
      />
    );
  }

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
      <main className="relative mx-auto w-full max-w-2xl px-5 py-8">
        <VoiceBackdrop />
        <CallRoom
          callSessionId={cs.id}
          conversationId={conversationId}
          role={isCaller ? "caller" : "listener"}
          otherName={otherName}
          otherId={isCaller ? c.listener_id : c.caller_id}
        />
        {help}
      </main>
    );
  }

  if (!isCaller) {
    return (
      <main className="relative mx-auto w-full max-w-lg px-5 py-16">
        <VoiceBackdrop />
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
        {help}
      </main>
    );
  }

  const [{ data: lp }, { data: cp }] = await Promise.all([
    supabase
      .from("listener_profiles")
      .select("per_minute_rate_minor, rate_currency")
      .eq("profile_id", c.listener_id)
      .single(),
    supabase.from("caller_profiles").select("credit_minor").eq("profile_id", userId).single(),
  ]);

  return (
    <main className="relative mx-auto w-full max-w-lg px-5 py-10">
      <VoiceBackdrop />
      <CallSetup
        conversationId={conversationId}
        listenerName={otherName}
        rateMinor={lp?.per_minute_rate_minor ?? 0}
        currency={lp?.rate_currency ?? "gbp"}
        creditMinor={(cp?.credit_minor as number | null) ?? 0}
      />
      {help}
    </main>
  );
}
