"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

const TOP_UP_AMOUNTS_MINOR = [500, 1000, 2000, 5000];

export type TopUpIntentResult = { clientSecret?: string; error?: string };
export type TopUpConfirmResult = { balanceMinor?: number; error?: string };

// Create an immediate-capture PaymentIntent for a wallet top-up.
export async function createTopUpIntent(amountMinor: number): Promise<TopUpIntentResult> {
  if (!TOP_UP_AMOUNTS_MINOR.includes(amountMinor)) return { error: "Pick one of the listed amounts." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  const { data: cp } = await supabase
    .from("caller_profiles")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .single();
  if (!cp) return { error: "Callers only." };

  let customerId = cp.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { gonatter_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("caller_profiles").update({ stripe_customer_id: customerId }).eq("profile_id", user.id);
  }

  const pi = await stripe.paymentIntents.create({
    amount: amountMinor,
    currency: "gbp",
    customer: customerId,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    metadata: { gonatter_topup: "1", caller_id: user.id },
  });
  return { clientSecret: pi.client_secret ?? undefined };
}

// After the browser confirms the payment, verify with Stripe and credit the
// wallet. The unique PaymentIntent id on the ledger makes this idempotent.
export async function confirmTopUp(paymentIntentId: string): Promise<TopUpConfirmResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.metadata?.gonatter_topup !== "1" || pi.metadata?.caller_id !== user.id) {
    return { error: "Payment not recognised." };
  }
  if (pi.status !== "succeeded") return { error: "Payment hasn't completed yet." };

  const admin = createAdminClient();
  const { error: ledgerErr } = await admin.from("credit_transactions").insert({
    caller_id: user.id,
    amount_minor: pi.amount,
    currency: pi.currency,
    kind: "topup",
    stripe_payment_intent_id: pi.id,
  });

  if (!ledgerErr) {
    const { data: cp } = await admin
      .from("caller_profiles")
      .select("credit_minor")
      .eq("profile_id", user.id)
      .single();
    const balanceMinor = (((cp?.credit_minor as number | null) ?? 0) + pi.amount);
    await admin.from("caller_profiles").update({ credit_minor: balanceMinor }).eq("profile_id", user.id);
    return { balanceMinor };
  }

  if (ledgerErr.code === "23505") {
    // Already credited (double confirm) — just report the current balance.
    const { data: cp } = await admin
      .from("caller_profiles")
      .select("credit_minor")
      .eq("profile_id", user.id)
      .single();
    return { balanceMinor: (cp?.credit_minor as number | null) ?? 0 };
  }
  return { error: "Couldn't credit your account. Contact support — your payment is safe." };
}
