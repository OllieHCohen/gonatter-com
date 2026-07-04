import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { releasePendingPayouts } from "@/lib/payouts";

// Authoritative backstop for async Stripe state. Local dev uses reconcile-on-
// return instead (no public URL); set STRIPE_WEBHOOK_SECRET once deployed.
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  if (secret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret);
    } catch (e) {
      return NextResponse.json({ error: `Bad signature: ${(e as Error).message}` }, { status: 400 });
    }
  } else {
    console.warn("STRIPE_WEBHOOK_SECRET not set — accepting unverified event (dev only)");
    event = JSON.parse(body) as Stripe.Event;
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "identity.verification_session.verified":
    case "identity.verification_session.requires_input":
    case "identity.verification_session.canceled": {
      const vs = event.data.object as Stripe.Identity.VerificationSession;
      const uid = vs.metadata?.gonatter_user_id;
      if (uid) {
        await admin
          .from("listener_profiles")
          .update({ stripe_identity_status: vs.status, id_verified: vs.status === "verified" })
          .eq("profile_id", uid);
      }
      break;
    }
    case "account.updated": {
      const acct = event.data.object as Stripe.Account;
      const uid = acct.metadata?.gonatter_user_id;
      if (uid) {
        const enabled = acct.payouts_enabled === true;
        await admin
          .from("listener_profiles")
          .update({ charges_enabled: enabled })
          .eq("profile_id", uid);
        // Settle any earnings that accrued while payouts weren't connected.
        if (enabled) await releasePendingPayouts(admin, uid, acct.id);
      }
      break;
    }
    default:
      // Other events (payment_intent.*) are handled synchronously at settlement.
      break;
  }

  return NextResponse.json({ received: true });
}
