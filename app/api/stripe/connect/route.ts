import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Create (or resume) a Stripe Connect Express onboarding link for the listener.
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("country, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "listener") {
    return NextResponse.json({ error: "Listeners only" }, { status: 403 });
  }
  const { data: lp } = await admin
    .from("listener_profiles")
    .select("stripe_account_id")
    .eq("profile_id", user.id)
    .single();

  let accountId = lp?.stripe_account_id ?? null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: (profile.country ?? "gb").toUpperCase(),
      email: user.email ?? undefined,
      business_type: "individual",
      capabilities: { transfers: { requested: true } },
      metadata: { gonatter_user_id: user.id },
    });
    accountId = account.id;
    await admin
      .from("listener_profiles")
      .update({ stripe_account_id: accountId })
      .eq("profile_id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/listener/onboarding?connect=refresh`,
    return_url: `${appUrl}/listener/onboarding/connect/return`,
    type: "account_onboarding",
  });
  return NextResponse.json({ url: link.url });
}
