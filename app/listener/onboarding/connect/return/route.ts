import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Reconcile-on-return: fetch the Connect account and update charges_enabled so
// onboarding works without webhooks (the webhook is the authoritative backstop).
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
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
    await admin
      .from("listener_profiles")
      .update({ charges_enabled: account.payouts_enabled === true })
      .eq("profile_id", user.id);
  }
  void req;
  return NextResponse.redirect(`${appUrl}/listener/onboarding?connect=done`);
}
