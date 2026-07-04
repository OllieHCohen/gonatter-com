"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REVIEW_UNLOCK_SECONDS } from "@/lib/billing";

export type ReviewResult = { ok?: boolean; error?: string };

// Both sides rate every finished call: callers rate listeners (public, feeds
// the discovery ranking) and listeners rate callers (kept for trust/safety).
export async function submitReview(
  callSessionId: string,
  rating: number,
  body?: string,
): Promise<ReviewResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Please pick 1–5 stars." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: cs } = await supabase
    .from("call_sessions")
    .select("id, caller_id, listener_id, state, billable_seconds")
    .eq("id", callSessionId)
    .maybeSingle();
  if (!cs || (cs.caller_id !== user.id && cs.listener_id !== user.id)) {
    return { error: "Call not found." };
  }
  // "failed" means the money settlement hit a problem — the call itself still
  // happened, so either party may absolutely review it.
  if (!["completed", "failed"].includes(cs.state)) {
    return { error: "You can review once the call has ended." };
  }
  if ((cs.billable_seconds ?? 0) < REVIEW_UNLOCK_SECONDS) {
    return { error: "Reviews are for calls where you actually talked." };
  }

  const isCaller = cs.caller_id === user.id;
  const admin = createAdminClient();
  const { error } = await admin.from("reviews").insert({
    call_session_id: callSessionId,
    reviewer_id: user.id,
    subject_id: isCaller ? cs.listener_id : cs.caller_id,
    direction: isCaller ? "caller_to_listener" : "listener_to_caller",
    rating,
    body: body?.trim() || null,
    is_public: true,
  });
  if (error) {
    if (error.code === "23505") return { error: "You've already reviewed this call." };
    return { error: "Couldn't save your review. Please try again." };
  }
  return { ok: true };
}
