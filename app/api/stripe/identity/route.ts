import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Start a Stripe Identity verification session (hosted redirect flow).
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL!;
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      return_url: `${appUrl}/listener/onboarding/identity/return`,
      metadata: { gonatter_user_id: user.id },
    });

    await admin
      .from("listener_profiles")
      .update({ stripe_identity_session_id: session.id, stripe_identity_status: "pending" })
      .eq("profile_id", user.id);

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Stripe Identity setup failed:", msg);
    await admin.from("bug_reports").insert({
      reporter_id: user.id,
      description: `Automatic report: identity verification (Stripe Identity) failed to start for this listener.\n\nStripe said: ${msg}`,
      page_url: "/listener/onboarding",
      context: { source: "api/stripe/identity" },
    });
    return NextResponse.json(
      { error: "Identity verification isn't available right now. The team has been notified — please try again later." },
      { status: 502 },
    );
  }
}
