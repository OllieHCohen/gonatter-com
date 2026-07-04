"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, acceptedEmail } from "@/lib/email";
import { blockState, BLOCKED_CONTACT_ERROR, BLOCKED_BY_ME_ERROR } from "@/lib/blocks";

const bodySchema = z.string().trim().min(1).max(2000);

export async function sendMessage(conversationId: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return { error: "Message can't be empty." };

  // No messaging across a block, in either direction.
  const { data: conv } = await supabase
    .from("conversations")
    .select("caller_id, listener_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return { error: "Conversation not found." };
  const otherId = conv.caller_id === user.id ? conv.listener_id : conv.caller_id;
  const blocked = await blockState(createAdminClient(), user.id, otherId);
  if (blocked.blockedByMe) return { error: BLOCKED_BY_ME_ERROR };
  if (blocked.blockedMe) return { error: BLOCKED_CONTACT_ERROR };

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: parsed.data });
  if (error) return { error: "Couldn't send. Try again." };

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  revalidatePath(`/messages/${conversationId}`);
  return { ok: true };
}

// Listener accepts or declines a pending pre-chat.
export async function setConversationState(
  conversationId: string,
  state: "accepted" | "declined" | "closed",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("conversations")
    .update({ state, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) return { error: "Couldn't update. Try again." };

  if (state === "accepted") {
    const { data: conv } = await supabase
      .from("conversations")
      .select("caller_id, listener:profiles!conversations_listener_id_fkey(display_name)")
      .eq("id", conversationId)
      .single();
    if (conv) {
      const admin = createAdminClient();
      const { data: cu } = await admin.auth.admin.getUserById(conv.caller_id);
      const listenerName =
        (conv.listener as unknown as { display_name: string } | null)?.display_name ?? "Your listener";
      if (cu.user?.email) {
        const { subject, html } = acceptedEmail(listenerName);
        await sendEmail(cu.user.email, subject, html);
      }
    }
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}
