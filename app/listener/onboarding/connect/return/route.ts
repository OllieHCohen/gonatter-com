import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { releasePendingPayouts } from "@/lib/payouts";

// Reconcile-on-return: fetch the Connect account and update charges_enabled so
// onboarding works without webhooks (the webhook is the authoritative backstop).
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL!;
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const admin = createAdminClient();
  const { data: lp } = await admin
    .from("listener_profiles")
    .select("stripe_account_id")
    .eq("profile_id", user.id)
    .single();

  if (lp?.stripe_account_id) {
    const account = await stripe.accounts.retrieve(lp.stripe_account_id);
    const enabled = account.payouts_enabled === true;
    await admin
      .from("listener_profiles")
      .update({ charges_enabled: enabled })
      .eq("profile_id", user.id);
    // Settle any earnings that accrued while payouts weren't connected.
    if (enabled) await releasePendingPayouts(admin, user.id, lp.stripe_account_id);
  }
  void req;
  return NextResponse.redirect(`${appUrl}/listener/onboarding?connect=done`);
}
