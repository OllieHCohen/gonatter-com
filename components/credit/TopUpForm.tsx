"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { createTopUpIntent, confirmTopUp } from "@/app/credit/actions";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const AMOUNTS_MINOR = [500, 1000, 2000, 5000];

export function TopUpForm() {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(1000);
  const [step, setStep] = useState<"choose" | "pay" | "done">("choose");
  const [busy, setBusy] = useState(false);
  const [payReady, setPayReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);

  async function toPayment() {
    setBusy(true);
    setError(null);
    const res = await createTopUpIntent(amount);
    setBusy(false);
    if (res.error || !res.clientSecret) {
      setError(res.error ?? "Couldn't start the top-up.");
      return;
    }
    const stripe = await stripePromise;
    if (!stripe) {
      setError("Payment isn't available right now.");
      return;
    }
    stripeRef.current = stripe;
    elementsRef.current = stripe.elements({ clientSecret: res.clientSecret });
    setStep("pay");
  }

  useEffect(() => {
    if (step === "pay" && elementsRef.current) {
      const paymentEl = elementsRef.current.create("payment", {
        layout: { type: "accordion", defaultCollapsed: false },
      });
      paymentEl.mount("#topup-payment-element");
      paymentEl.on("ready", () => setPayReady(true));
    }
  }, [step]);

  async function pay() {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (err || !paymentIntent) {
      setBusy(false);
      setError(err?.message ?? "Payment couldn't be completed.");
      return;
    }
    const res = await confirmTopUp(paymentIntent.id);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setNewBalance(res.balanceMinor ?? null);
    setStep("done");
    router.refresh();
  }

  if (step === "done") {
    return (
      <div className="mt-3 rounded-xl bg-mint px-4 py-4 text-center">
        <p className="font-semibold text-navy">
          Credit added ✓{newBalance != null && <> — your balance is {formatMoney(newBalance, "gbp")}</>}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {step === "choose" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {AMOUNTS_MINOR.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a)}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-center font-bold text-navy transition-colors",
                  amount === a ? "border-teal bg-mint" : "border-line bg-white",
                )}
              >
                {formatMoney(a, "gbp")}
              </button>
            ))}
          </div>
          {error && <FieldError>{error}</FieldError>}
          <Button onClick={toPayment} disabled={busy} size="lg" className="w-full">
            {busy ? "Setting up…" : `Top up ${formatMoney(amount, "gbp")}`}
          </Button>
        </>
      )}

      {step === "pay" && (
        <>
          <div id="topup-payment-element" />
          {!payReady && (
            <div className="animate-pulse space-y-3" aria-hidden>
              <div className="h-11 rounded-xl bg-mint/70" />
              <div className="h-11 rounded-xl bg-mint/70" />
              <p className="text-center text-sm text-muted">Loading secure payment form…</p>
            </div>
          )}
          {error && <FieldError>{error}</FieldError>}
          <Button onClick={pay} disabled={busy || !payReady} size="lg" className="w-full">
            {busy ? "Paying…" : payReady ? `Pay ${formatMoney(amount, "gbp")}` : "Loading…"}
          </Button>
        </>
      )}
    </div>
  );
}
