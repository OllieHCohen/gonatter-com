import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

// Transfer every pending payout owed to a listener who has just become able
// to receive money. Earnings accrue while payouts are unconnected (going live
// doesn't require them), so this is where the backlog gets settled.
export async function releasePendingPayouts(
  admin: SupabaseClient,
  listenerId: string,
  stripeAccountId: string,
): Promise<void> {
  const { data: pending } = await admin
    .from("payouts")
    .select("id, amount_minor, currency")
    .eq("listener_id", listenerId)
    .eq("status", "pending")
    .is("stripe_transfer_id", null);

  for (const p of pending ?? []) {
    try {
      const transfer = await stripe.transfers.create({
        amount: p.amount_minor,
        currency: p.currency,
        destination: stripeAccountId,
        metadata: { payout_id: p.id },
      });
      await admin
        .from("payouts")
        .update({ status: "paid", stripe_transfer_id: transfer.id })
        .eq("id", p.id)
        .eq("status", "pending");
    } catch (e) {
      // Leave the row pending so the next enable event retries it.
      console.error("Pending payout transfer failed:", p.id, e);
    }
  }
}
