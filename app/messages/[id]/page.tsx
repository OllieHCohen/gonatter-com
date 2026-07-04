import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { blockState } from "@/lib/blocks";
import { Thread, type ThreadMessage } from "@/components/messages/Thread";
import type { ConversationState } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

type ConvRow = {
  id: string;
  caller_id: string;
  listener_id: string;
  state: ConversationState;
  caller: { display_name: string } | null;
  listener: { display_name: string } | null;
};

export default async function ConversationPage({ params }: Params) {
  const { id } = await params;
  const { userId, profile } = await requireUser();
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, caller_id, listener_id, state, caller:profiles!conversations_caller_id_fkey(display_name), listener:profiles!conversations_listener_id_fkey(display_name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!conv) notFound();
  const c = conv as unknown as ConvRow;

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const isListener = c.listener_id === userId;
  const otherName =
    (isListener ? c.caller?.display_name : c.listener?.display_name) ?? "Someone";
  const otherId = isListener ? c.caller_id : c.listener_id;
  const blocked = await blockState(createAdminClient(), userId, otherId);

  return (
    <Thread
      conversationId={c.id}
      userId={userId}
      role={profile?.role === "listener" ? "listener" : "caller"}
      otherName={otherName}
      otherId={otherId}
      initialState={c.state}
      initialMessages={(msgs ?? []) as ThreadMessage[]}
      initialBlockedByMe={blocked.blockedByMe}
      initialBlockedMe={blocked.blockedMe}
    />
  );
}
