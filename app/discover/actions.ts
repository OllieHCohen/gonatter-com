"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, newMessageEmail } from "@/lib/email";
import { PRECHAT_OPENER } from "@/lib/copy";
import { blockState } from "@/lib/blocks";

// Caller starts (or re-opens) a pre-chat with a listener, then lands in the
// conversation thread. One conversation per (caller, listener) pair.
export async function startConversation(formData: FormData) {
  const listenerId = String(formData.get("listener_id") ?? "");
  if (!listenerId) redirect("/discover");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // No new conversations across a block, in either direction.
  const blocked = await blockState(createAdminClient(), user.id, listenerId);
  if (blocked.blockedByMe || blocked.blockedMe) redirect("/discover");

  // Mark the platonic reminder as seen (first-time gate).
  await supabase
    .from("caller_profiles")
    .update({ seen_platonic_reminder: true })
    .eq("profile_id", user.id);

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("caller_id", user.id)
    .eq("listener_id", listenerId)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;

  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ caller_id: user.id, listener_id: listenerId })
      .select("id")
      .single();
    if (error || !created) redirect(`/discover/${listenerId}?error=1`);
    conversationId = created.id as string;
    await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, body: PRECHAT_OPENER });

    // Notify the listener (best-effort).
    const admin = createAdminClient();
    const [{ data: me }, { data: lu }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
      admin.auth.admin.getUserById(listenerId),
    ]);
    if (lu.user?.email) {
      const { subject, html } = newMessageEmail(me?.display_name ?? "Someone");
      await sendEmail(lu.user.email, subject, html);
    }
  }

  redirect(`/messages/${conversationId}`);
}
