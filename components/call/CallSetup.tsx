"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  creditMinor?: number;
};

export function CallSetup({ conversationId, listenerName, rateMinor, currency, creditMinor = 0 }: Props) {
  const router = useRouter();
  const [block, setBlock] = useState<30 | 60>(30);
  const [step, setStep] = useState<"choose" | "pay">("choose");
  const [busy, setBusy] = useState(false);
  const [payReady, setPayReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);

  const maxHold = rateMinor * block;
  const creditCovers = creditMinor >= maxHold;

  async function toPayment() {
    setBusy(true);
    setError(null);
    const res = await createCallHold(conversationId, block);
    if (res.funded === "credit" && res.callSessionId) {
      // Paid from the wallet — no card step; the server page renders the room.
      router.refresh();
      return;
    }
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
      const paymentEl = elementsRef.current.create("payment", {
        layout: { type: "accordion", defaultCollapsed: false },
      });
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
          <p className="w-fit rounded-full bg-success/15 px-4 py-2 text-sm font-bold text-success">
            {"🎁 First 2 minutes free"}
          </p>
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

          <div
            className={cn(
              "rounded-2xl border px-5 py-4",
              creditCovers ? "border-success/50 bg-success/5" : "border-line bg-white",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted">Your call credit</p>
                <p className="font-display text-3xl font-bold text-teal">
                  {formatMoney(creditMinor, currency)}
                </p>
              </div>
              {creditCovers ? (
                <span className="rounded-full bg-success/10 px-4 py-2 text-sm font-bold text-success">
                  ✓ Covers this call
                </span>
              ) : (
                <Link
                  href="/credit"
                  className="rounded-full bg-teal px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600"
                >
                  Top up credit
                </Link>
              )}
            </div>
            <p className="mt-2 text-sm text-navy">
              {creditCovers
                ? "No card needed — only the minutes you actually talk are deducted from your credit."
                : creditMinor > 0
                  ? `Not enough to cover this ${block}-minute block (${formatMoney(maxHold, currency)}). Top up to skip the card step, or continue with a card below.`
                  : "Top up once and start calls instantly — no card step each time."}
            </p>
          </div>

          {!creditCovers && (
            <p className="text-sm text-muted">
              {`We'll hold ${formatMoney(maxHold, currency)} on your card. You're only charged for the minutes you actually talk — anything unused is released.`}
            </p>
          )}

          {error && <FieldError>{error}</FieldError>}
          <Button onClick={toPayment} disabled={busy} size="lg" className="w-full">
            {busy ? "Setting up…" : creditCovers ? "Start call using credit" : "Continue to payment"}
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
