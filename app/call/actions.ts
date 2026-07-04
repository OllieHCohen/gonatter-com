"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { authorisedAmount, settle } from "@/lib/billing";
import { mintCallToken, countParticipants, closeRoom, livekitWsUrl } from "@/lib/livekit";

type HoldResult = { clientSecret?: string; callSessionId?: string; error?: string };

// CALLER: create the LiveKit room + a manual-capture Stripe hold for the chosen
// block. The hold (= block length × rate) is the hard cap; we capture the real
// amount at settlement. Returns a PaymentIntent client_secret for the browser
// to confirm the card against.
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

  // Reuse or create the caller's Stripe customer.
  const { data: cp } = await supabase
    .from("caller_profiles")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .single();
  let customerId = cp?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { gonatter_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("caller_profiles").update({ stripe_customer_id: customerId }).eq("profile_id", user.id);
  }

  const authorised = authorisedAmount(lp.per_minute_rate_minor, blockMinutes);
  const room = `conv-${conversationId.slice(0, 8)}-${Date.now()}`;

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
    })
    .select("id")
    .single();
  if (csErr || !cs) return { error: "Couldn't start the call. Try again." };

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

  return { clientSecret: pi.client_secret ?? undefined, callSessionId: cs.id };
}

type TokenResult = {
  token?: string;
  wsUrl?: string;
  room?: string;
  blockMinutes?: number;
  currency?: string;
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
    .select("id, caller_id, listener_id, livekit_room, state, block_minutes, rate_currency")
    .eq("id", callSessionId)
    .maybeSingle();
  if (!cs || (cs.caller_id !== user.id && cs.listener_id !== user.id)) {
    return { error: "Call not found." };
  }
  if (cs.state === "completed" || cs.state === "cancelled" || cs.state === "failed") {
    return { error: "This call has ended." };
  }

  const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
  const token = await mintCallToken(cs.livekit_room, user.id, prof?.display_name ?? "Guest");
  return {
    token,
    wsUrl: livekitWsUrl,
    room: cs.livekit_room,
    blockMinutes: cs.block_minutes,
    currency: cs.rate_currency,
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
  error?: string;
};

// Settle a call: measure billable time on the server, capture the real amount
// (<= the hold), pay the listener their 75%, finalise. Idempotent.
export async function endCall(
  callSessionId: string,
  reason: "caller_left" | "listener_left" | "block_reached" | "no_show" | "error" = "caller_left",
): Promise<SettleResult> {
  const admin = createAdminClient();
  const { data: cs } = await admin.from("call_sessions").select("*").eq("id", callSessionId).single();
  if (!cs) return { charged: false, finalAmountMinor: 0, chargeSeconds: 0, error: "Not found" };

  // Already finalised — return what we recorded.
  if (["completed", "cancelled", "failed"].includes(cs.state)) {
    return { charged: (cs.final_amount_minor ?? 0) > 0, finalAmountMinor: cs.final_amount_minor ?? 0, chargeSeconds: cs.billable_seconds ?? 0 };
  }

  const endedAt = new Date();
  const billableSeconds = cs.both_connected_at
    ? Math.max(0, Math.floor((endedAt.getTime() - new Date(cs.both_connected_at).getTime()) / 1000))
    : 0;

  const result = settle({
    billableSeconds,
    rateMinor: cs.rate_minor,
    blockMinutes: cs.block_minutes as 30 | 60,
    feePercent: PLATFORM_FEE_PERCENT,
  });

  const { data: pay } = await admin
    .from("payments")
    .select("stripe_payment_intent_id")
    .eq("call_session_id", callSessionId)
    .single();
  const piId = pay?.stripe_payment_intent_id as string | undefined;

  try {
    if (!result.charge) {
      if (piId) {
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
      if (piId) {
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
  } catch {
    await admin
      .from("call_sessions")
      .update({ state: "failed", ended_at: endedAt.toISOString(), billable_seconds: billableSeconds, end_reason: "error" })
      .eq("id", callSessionId);
    return { charged: false, finalAmountMinor: 0, chargeSeconds: billableSeconds, error: "Settlement failed" };
  }

  await closeRoom(cs.livekit_room);
  // Deliberately NO revalidatePath here: it makes the client refetch the call
  // page mid-settlement, which swaps CallRoom out for CallSetup and destroys
  // the end-of-call receipt before the user ever sees it.
  return { charged: result.charge, finalAmountMinor: result.finalAmountMinor, chargeSeconds: result.chargeSeconds };
}
