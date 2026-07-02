"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { createCallHold } from "@/app/call/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { formatMoney, formatRate } from "@/lib/money";
import { SPEND_CAP } from "@/lib/copy";
import { cn } from "@/lib/cn";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type Props = {
  conversationId: string;
  listenerName: string;
  rateMinor: number;
  currency: string;
};

export function CallSetup({ conversationId, listenerName, rateMinor, currency }: Props) {
  const router = useRouter();
  const [block, setBlock] = useState<30 | 60>(30);
  const [step, setStep] = useState<"choose" | "pay">("choose");
  const [busy, setBusy] = useState(false);
  const [payReady, setPayReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);

  const maxHold = rateMinor * block;

  async function toPayment() {
    setBusy(true);
    setError(null);
    const res = await createCallHold(conversationId, block);
    setBusy(false);
    if (res.error || !res.clientSecret) {
      setError(res.error ?? "Couldn't set up the call.");
      return;
    }
    const stripe = await stripePromise;
    if (!stripe) {
      setError("Payment isn't available right now.");
      return;
    }
    stripeRef.current = stripe;
    const elements = stripe.elements({ clientSecret: res.clientSecret });
    elementsRef.current = elements;
    setStep("pay");
  }

  useEffect(() => {
    if (step === "pay" && elementsRef.current) {
      const paymentEl = elementsRef.current.create("payment");
      paymentEl.mount("#payment-element");
      paymentEl.on("ready", () => setPayReady(true));
    }
  }, [step]);

  async function authoriseAndConnect() {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (err) {
      setBusy(false);
      setError(err.message ?? "Card couldn't be authorised.");
      return;
    }
    // Hold placed. The server page will now render the call room.
    router.refresh();
  }

  return (
    <Card className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Call {listenerName}</h1>
        <p className="mt-1 text-muted">{formatRate(rateMinor, currency)}</p>
      </div>

      {step === "choose" && (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold text-navy">How long do you want to talk for?</p>
            <div className="grid grid-cols-2 gap-3">
              {([30, 60] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBlock(m)}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-center transition-colors",
                    block === m ? "border-teal bg-mint" : "border-line bg-white",
                  )}
                >
                  <span className="block text-lg font-bold text-navy">{m} min</span>
                  <span className="text-sm text-muted">up to {formatMoney(rateMinor * m, currency)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-mint/60 px-4 py-3 text-sm text-navy">{SPEND_CAP}</div>
          <p className="text-sm text-muted">
            We&apos;ll hold {formatMoney(maxHold, currency)}. You&apos;re only charged for the minutes you
            actually talk — anything unused is released.
          </p>

          {error && <FieldError>{error}</FieldError>}
          <Button onClick={toPayment} disabled={busy} size="lg" className="w-full">
            {busy ? "Setting up…" : "Continue to payment"}
          </Button>
        </>
      )}

      {step === "pay" && (
        <>
          <p className="text-sm text-muted">
            Add a card to hold {formatMoney(maxHold, currency)}. This is an authorisation, not a charge.
          </p>
          <div id="payment-element" />
          {!payReady && (
            <div className="animate-pulse space-y-3" aria-hidden>
              <div className="h-11 rounded-xl bg-mint/70" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-11 rounded-xl bg-mint/70" />
                <div className="h-11 rounded-xl bg-mint/70" />
              </div>
              <p className="text-center text-sm text-muted">Loading secure payment form…</p>
            </div>
          )}
          {error && <FieldError>{error}</FieldError>}
          <Button
            onClick={authoriseAndConnect}
            disabled={busy || !payReady}
            size="lg"
            className="w-full"
          >
            {busy ? "Authorising…" : payReady ? "Authorise & connect" : "Loading…"}
          </Button>
        </>
      )}
    </Card>
  );
}
