import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Start a Stripe Identity verification session (hosted redirect flow).
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    return_url: `${appUrl}/listener/onboarding/identity/return`,
    metadata: { gonatter_user_id: user.id },
  });

  const admin = createAdminClient();
  await admin
    .from("listener_profiles")
    .update({ stripe_identity_session_id: session.id, stripe_identity_status: "pending" })
    .eq("profile_id", user.id);

  return NextResponse.json({ url: session.url });
}
