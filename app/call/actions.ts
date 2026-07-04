"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { authorisedAmount, settle } from "@/lib/billing";
import { mintCallToken, countParticipants, closeRoom, livekitWsUrl } from "@/lib/livekit";
import { sendEmail, incomingCallEmail } from "@/lib/email";
import { generateConversationStarters } from "@/lib/starters";

// AI conversation starters for either party, built from the other's profile.
export async function getConversationStarters(
  conversationId: string,
): Promise<{ starters: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { starters: [] };

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "caller_id, listener_id, caller:profiles!conversations_caller_id_fkey(display_name), listener:profiles!conversations_listener_id_fkey(display_name)",
    )
    .eq("id", conversationId)
    .maybeSingle();
  const c = conv as unknown as {
    caller_id: string;
    listener_id: string;
    caller: { display_name: string } | null;
    listener: { display_name: string } | null;
  } | null;
  if (!c || (c.caller_id !== user.id && c.listener_id !== user.id)) return { starters: [] };

  const isCaller = c.caller_id === user.id;
  const admin = createAdminClient();

  let otherBio: string | null = null;
  let otherTopics: string[] = [];
  if (isCaller) {
    const [{ data: lp }, { data: li }] = await Promise.all([
      admin.from("listener_profiles").select("bio").eq("profile_id", c.listener_id).maybeSingle(),
      admin.from("listener_interests").select("interests(label)").eq("listener_id", c.listener_id),
    ]);
    otherBio = (lp?.bio as string | null) ?? null;
    otherTopics = ((li ?? []) as unknown as { interests: { label: string } | null }[])
      .map((r) => r.interests?.label)
      .filter((l): l is string => Boolean(l));
  } else {
    // Callers have thin profiles — pull whatever interests exist; the
    // generator falls back to warm general openers when there's nothing.
    const { data: cp } = await admin
      .from("caller_profiles")
      .select("interests")
      .eq("profile_id", c.caller_id)
      .maybeSingle();
    const ids = ((cp?.interests as string[] | null) ?? []).filter(Boolean);
    if (ids.length) {
      const { data: labels } = await admin.from("interests").select("label").in("id", ids);
      otherTopics = ((labels ?? []) as { label: string }[]).map((l) => l.label);
    }
  }

  const starters = await generateConversationStarters({
    speakerName: (isCaller ? c.caller?.display_name : c.listener?.display_name) ?? "You",
    speakerRole: isCaller ? "caller" : "listener",
    otherName: (isCaller ? c.listener?.display_name : c.caller?.display_name) ?? "the other person",
    otherBio,
    otherTopics,
  });
  return { starters };
}

type HoldResult = {
  clientSecret?: string;
  callSessionId?: string;
  funded?: "card" | "credit";
  error?: string;
};

// Tell the listener a call has started: email now; their browser banner picks
// up the session insert via realtime. Best-effort — never blocks the call.
async function notifyListenerOfCall(listenerId: string, callerName: string, conversationId: string) {
  try {
    const admin = createAdminClient();
    const { data: lu } = await admin.auth.admin.getUserById(listenerId);
    if (lu.user?.email) {
      const { subject, html } = incomingCallEmail(callerName, conversationId);
      await sendEmail(lu.user.email, subject, html);
    }
  } catch (e) {
    console.error("incoming-call notification failed:", e);
  }
}

// CALLER: create the LiveKit room + a manual-capture Stripe hold for the chosen
// block. The hold (= block length × rate) is the hard cap; we capture the real
// amount at settlement. Prepaid credit covers the block instead when the
// caller's balance is sufficient — no card step at all.
export async function createCallHold(
  conversationId: string,
  blockMinutes: 30 | 60,
): Promise<HoldResult> {
  if (blockMinutes !== 30 && blockMinutes !== 60) return { error: "Invalid call length." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, caller_id, listener_id, state")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv || conv.caller_id !== user.id) return { error: "Conversation not found." };
  if (conv.state !== "accepted") return { error: "This listener hasn't accepted yet." };

  const admin = createAdminClient();
  const { data: lp } = await admin
    .from("listener_profiles")
    .select("per_minute_rate_minor, rate_currency, stripe_account_id, charges_enabled")
    .eq("profile_id", conv.listener_id)
    .single();
  if (!lp) return { error: "Listener unavailable." };
  // No charges_enabled check: the caller pays the platform either way, and the
  // listener's share accrues as a pending payout until they connect an account.

  const { data: cp } = await supabase
    .from("caller_profiles")
    .select("stripe_customer_id, credit_minor")
    .eq("profile_id", user.id)
    .single();

  const authorised = authorisedAmount(lp.per_minute_rate_minor, blockMinutes);
  const room = `conv-${conversationId.slice(0, 8)}-${Date.now()}`;

  // Prepaid credit covers the whole block? Skip the card entirely — the block
  // is funded from the wallet and settlement deducts only the talked minutes.
  const credit = (cp?.credit_minor as number | null) ?? 0;
  const useCredit = credit >= authorised;

  const { data: cs, error: csErr } = await admin
    .from("call_sessions")
    .insert({
      conversation_id: conversationId,
      caller_id: user.id,
      listener_id: conv.listener_id,
      livekit_room: room,
      rate_minor: lp.per_minute_rate_minor,
      rate_currency: lp.rate_currency,
      block_minutes: blockMinutes,
      authorised_amount_minor: authorised,
      state: "authorising",
      funding: useCredit ? "credit" : "card",
    })
    .select("id")
    .single();
  if (csErr || !cs) return { error: "Couldn't start the call. Try again." };

  if (useCredit) {
    return { callSessionId: cs.id, funded: "credit" };
  }

  // Card path: reuse or create the caller's Stripe customer + manual hold.
  let customerId = cp?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { gonatter_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("caller_profiles").update({ stripe_customer_id: customerId }).eq("profile_id", user.id);
  }

  const pi = await stripe.paymentIntents.create({
    amount: authorised,
    currency: lp.rate_currency,
    customer: customerId,
    capture_method: "manual",
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    metadata: { call_session_id: cs.id, caller_id: user.id, listener_id: conv.listener_id },
  });

  await admin.from("payments").insert({
    call_session_id: cs.id,
    stripe_payment_intent_id: pi.id,
    authorised_amount_minor: authorised,
    currency: lp.rate_currency,
    status: "requires_capture",
  });

  return { clientSecret: pi.client_secret ?? undefined, callSessionId: cs.id, funded: "card" };
}

type TokenResult = {
  token?: string;
  wsUrl?: string;
  room?: string;
  blockMinutes?: number;
  currency?: string;
  funding?: "card" | "credit";
  rateMinor?: number;
  creditMinor?: number;
  error?: string;
};

// Mint a LiveKit join token for the signed-in participant of this call.
export async function getCallToken(callSessionId: string): Promise<TokenResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: cs } = await supabase
    .from("call_sessions")
    .select("id, caller_id, listener_id, livekit_room, state, block_minutes, rate_currency, rate_minor, funding")
    .eq("id", callSessionId)
    .maybeSingle();
  if (!cs || (cs.caller_id !== user.id && cs.listener_id !== user.id)) {
    return { error: "Call not found." };
  }
  if (cs.state === "completed" || cs.state === "cancelled" || cs.state === "failed") {
    return { error: "This call has ended." };
  }

  // Credit-funded calls show the caller their remaining balance live.
  let creditMinor: number | undefined;
  if (cs.funding === "credit" && cs.caller_id === user.id) {
    const { data: cp } = await supabase
      .from("caller_profiles")
      .select("credit_minor")
      .eq("profile_id", user.id)
      .single();
    creditMinor = (cp?.credit_minor as number | null) ?? 0;
  }

  const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
  const token = await mintCallToken(cs.livekit_room, user.id, prof?.display_name ?? "Guest");
  return {
    token,
    wsUrl: livekitWsUrl,
    room: cs.livekit_room,
    blockMinutes: cs.block_minutes,
    currency: cs.rate_currency,
    funding: cs.funding as "card" | "credit",
    rateMinor: cs.rate_minor,
    creditMinor,
  };
}

// Server-authoritative connection check: verify against LiveKit who is really
// in the room and stamp both_connected_at (the billing start) on the server
// clock the first time both sides are present.
export async function markConnected(
  callSessionId: string,
): Promise<{ active: boolean; bothConnectedAt: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { active: false, bothConnectedAt: null };

  const admin = createAdminClient();
  const { data: cs } = await admin
    .from("call_sessions")
    .select("*")
    .eq("id", callSessionId)
    .single();
  if (!cs) return { active: false, bothConnectedAt: null };
  if (cs.caller_id !== user.id && cs.listener_id !== user.id) {
    return { active: false, bothConnectedAt: null };
  }

  const isCaller = cs.caller_id === user.id;

  // First time the caller lands in the room: nudge the listener to join
  // (email now; their in-app banner reacts to the session via realtime).
  if (isCaller && !cs.caller_connected) {
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", cs.caller_id)
      .single();
    void notifyListenerOfCall(
      cs.listener_id,
      callerProfile?.display_name ?? "A caller",
      cs.conversation_id,
    );
  }

  const n = await countParticipants(cs.livekit_room);
  const patch: Record<string, unknown> = {
    [isCaller ? "caller_connected" : "listener_connected"]: true,
    updated_at: new Date().toISOString(),
  };
  if (!cs.started_at) patch.started_at = new Date().toISOString();
  let active = cs.state === "active";
  let bothConnectedAt = cs.both_connected_at as string | null;
  if (n >= 2 && !cs.both_connected_at) {
    bothConnectedAt = new Date().toISOString();
    patch.both_connected_at = bothConnectedAt;
    patch.state = "active";
    active = true;
  }
  await admin.from("call_sessions").update(patch).eq("id", callSessionId);
  return { active, bothConnectedAt };
}

type SettleResult = {
  charged: boolean;
  finalAmountMinor: number;
  chargeSeconds: number;
  billableSeconds?: number; // actual connected time — reviews unlock on this, not on what was charged
  startedAt?: string | null;
  endedAt?: string | null;
  error?: string;
};

function recordedResult(cs: {
  final_amount_minor: number | null;
  billable_seconds: number | null;
  both_connected_at: string | null;
  ended_at: string | null;
  state: string;
}): SettleResult {
  return {
    charged: (cs.final_amount_minor ?? 0) > 0,
    finalAmountMinor: cs.final_amount_minor ?? 0,
    chargeSeconds: cs.billable_seconds ?? 0,
    billableSeconds: cs.billable_seconds ?? 0,
    startedAt: cs.both_connected_at,
    endedAt: cs.ended_at,
    error: cs.state === "failed" ? "Settlement failed" : undefined,
  };
}

// Settle a call: measure billable time on the server, capture the real amount
// (<= the hold), pay the listener their 75%, finalise. Idempotent — both
// parties' browsers call this when a call ends (one ends, the other reacts to
// the disconnect), so settlement is claimed atomically and the loser just
// waits for the winner's outcome instead of double-capturing.
export async function endCall(
  callSessionId: string,
  reason: "caller_left" | "listener_left" | "block_reached" | "no_show" | "error" = "caller_left",
): Promise<SettleResult> {
  const admin = createAdminClient();
  const endedAt = new Date();

  // Atomic claim: only the first caller flips ended_at from null.
  const { data: claimed } = await admin
    .from("call_sessions")
    .update({ ended_at: endedAt.toISOString(), end_reason: reason })
    .eq("id", callSessionId)
    .is("ended_at", null)
    .select("*")
    .maybeSingle();

  const cs = claimed;
  if (!cs) {
    // Someone else claimed it (or it's already settled) — wait for the outcome.
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: row } = await admin
        .from("call_sessions")
        .select("*")
        .eq("id", callSessionId)
        .maybeSingle();
      if (!row) return { charged: false, finalAmountMinor: 0, chargeSeconds: 0, error: "Not found" };
      if (["completed", "cancelled", "failed"].includes(row.state)) return recordedResult(row);
      await new Promise((r) => setTimeout(r, 700));
    }
    return { charged: false, finalAmountMinor: 0, chargeSeconds: 0, error: "Settlement still in progress" };
  }

  const billableSeconds = cs.both_connected_at
    ? Math.max(0, Math.floor((endedAt.getTime() - new Date(cs.both_connected_at).getTime()) / 1000))
    : 0;

  const result = settle({
    billableSeconds,
    rateMinor: cs.rate_minor,
    blockMinutes: cs.block_minutes as 30 | 60,
    feePercent: PLATFORM_FEE_PERCENT,
  });

  const isCredit = cs.funding === "credit";
  const { data: pay } = await admin
    .from("payments")
    .select("stripe_payment_intent_id")
    .eq("call_session_id", callSessionId)
    .maybeSingle();
  const piId = pay?.stripe_payment_intent_id as string | undefined;

  try {
    if (!result.charge) {
      if (!isCredit && piId) {
        const pi = await stripe.paymentIntents.retrieve(piId);
        if (pi.status !== "canceled" && pi.status !== "succeeded") {
          await stripe.paymentIntents.cancel(piId);
        }
        await admin.from("payments").update({ status: "canceled" }).eq("call_session_id", callSessionId);
      }
      await admin
        .from("call_sessions")
        .update({
          state: "completed",
          ended_at: endedAt.toISOString(),
          billable_seconds: billableSeconds,
          final_amount_minor: 0,
          end_reason: reason,
        })
        .eq("id", callSessionId);
    } else {
      if (isCredit) {
        // Deduct the talked minutes from the caller's prepaid balance.
        const { data: cp } = await admin
          .from("caller_profiles")
          .select("credit_minor")
          .eq("profile_id", cs.caller_id)
          .single();
        const newBalance = Math.max(0, ((cp?.credit_minor as number | null) ?? 0) - result.finalAmountMinor);
        await admin.from("caller_profiles").update({ credit_minor: newBalance }).eq("profile_id", cs.caller_id);
        await admin.from("credit_transactions").insert({
          caller_id: cs.caller_id,
          amount_minor: -result.finalAmountMinor,
          currency: cs.rate_currency,
          kind: "call_charge",
          call_session_id: callSessionId,
        });
      } else if (piId) {
        await stripe.paymentIntents.capture(piId, { amount_to_capture: result.finalAmountMinor });
        await admin
          .from("payments")
          .update({ status: "captured", captured_amount_minor: result.finalAmountMinor })
          .eq("call_session_id", callSessionId);
      }

      // Pay the listener their share via Stripe Connect transfer. If the
      // listener has no Connect account yet, record the debt as a pending
      // payout instead of silently dropping it — the money owed must never
      // vanish just because onboarding was incomplete.
      const { data: lp } = await admin
        .from("listener_profiles")
        .select("stripe_account_id, calls_count")
        .eq("profile_id", cs.listener_id)
        .single();
      if (result.listenerAmountMinor > 0) {
        if (lp?.stripe_account_id) {
          const transfer = await stripe.transfers.create({
            amount: result.listenerAmountMinor,
            currency: cs.rate_currency,
            destination: lp.stripe_account_id,
            metadata: { call_session_id: callSessionId },
          });
          await admin.from("payouts").insert({
            call_session_id: callSessionId,
            listener_id: cs.listener_id,
            stripe_transfer_id: transfer.id,
            amount_minor: result.listenerAmountMinor,
            currency: cs.rate_currency,
            platform_fee_minor: result.platformFeeMinor,
            status: "paid",
          });
        } else {
          await admin.from("payouts").insert({
            call_session_id: callSessionId,
            listener_id: cs.listener_id,
            amount_minor: result.listenerAmountMinor,
            currency: cs.rate_currency,
            platform_fee_minor: result.platformFeeMinor,
            status: "pending",
          });
        }
      }

      await admin
        .from("call_sessions")
        .update({
          state: "completed",
          ended_at: endedAt.toISOString(),
          billable_seconds: billableSeconds,
          final_amount_minor: result.finalAmountMinor,
          end_reason: reason,
        })
        .eq("id", callSessionId);

      await admin
        .from("listener_profiles")
        .update({ calls_count: (lp?.calls_count ?? 0) + 1 })
        .eq("profile_id", cs.listener_id);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Call settlement failed:", callSessionId, msg);
    await admin
      .from("call_sessions")
      .update({ state: "failed", ended_at: endedAt.toISOString(), billable_seconds: billableSeconds, end_reason: "error" })
      .eq("id", callSessionId);
    // Money problems must never be silent — straight into the admin bug queue.
    await admin.from("bug_reports").insert({
      reporter_id: cs.caller_id,
      description: `Automatic report: call settlement failed for session ${callSessionId}.\n\nError: ${msg}`,
      page_url: `/call/${cs.conversation_id}`,
      context: { source: "endCall", billable_seconds: String(billableSeconds) },
    });
    return {
      charged: false,
      finalAmountMinor: 0,
      chargeSeconds: billableSeconds,
      billableSeconds,
      startedAt: cs.both_connected_at,
      endedAt: endedAt.toISOString(),
      error: "Settlement failed",
    };
  }

  await closeRoom(cs.livekit_room);
  // Deliberately NO revalidatePath here: it makes the client refetch the call
  // page mid-settlement, which swaps CallRoom out for CallSetup and destroys
  // the end-of-call receipt before the user ever sees it.
  return {
    charged: result.charge,
    finalAmountMinor: result.finalAmountMinor,
    chargeSeconds: result.chargeSeconds,
    billableSeconds,
    startedAt: cs.both_connected_at,
    endedAt: endedAt.toISOString(),
  };
}
