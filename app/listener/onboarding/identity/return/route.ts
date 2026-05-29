import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Reconcile-on-return: check the Identity session status and set id_verified.
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const admin = createAdminClient();
  const { data: lp } = await admin
    .from("listener_profiles")
    .select("stripe_identity_session_id")
    .eq("profile_id", user.id)
    .single();

  if (lp?.stripe_identity_session_id) {
    const vs = await stripe.identity.verificationSessions.retrieve(lp.stripe_identity_session_id);
    const verified = vs.status === "verified";
    await admin
      .from("listener_profiles")
      .update({
        stripe_identity_status: vs.status,
        id_verified: verified,
      })
      .eq("profile_id", user.id);
  }
  return NextResponse.redirect(`${appUrl}/listener/onboarding?identity=done`);
}
