"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError, Hint } from "@/components/ui/Field";

export default function VerifyPhonePage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError(undefined);
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Couldn't send the code.");
      return;
    }
    setStep("code");
  }

  async function check() {
    setBusy(true);
    setError(undefined);
    const res = await fetch("/api/otp/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    if (!res.ok) {
      setBusy(false);
      setError((await res.json()).error ?? "That code wasn't right.");
      return;
    }
    router.push("/post-auth");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8 text-center">
        <Logo variant="light" />
        <h1 className="mt-6 text-3xl font-bold text-navy">Verify your phone</h1>
        <p className="mt-2 text-muted">A quick check to keep gonatter safe for everyone.</p>
      </div>

      {step === "phone" ? (
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+44 7700 900123"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\s+/g, ""))}
            />
            <Hint>Use international format, starting with +.</Hint>
          </div>
          <FieldError>{error}</FieldError>
          <Button size="lg" onClick={send} disabled={busy || phone.length < 8}>
            {busy ? "Sending…" : "Send code"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="code">Enter the code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <Hint>We sent a 6-digit code to {phone}.</Hint>
          </div>
          <FieldError>{error}</FieldError>
          <Button size="lg" onClick={check} disabled={busy || code.length < 4}>
            {busy ? "Checking…" : "Verify"}
          </Button>
          <button
            type="button"
            className="text-sm text-muted hover:text-navy"
            onClick={() => setStep("phone")}
          >
            Use a different number
          </button>
        </div>
      )}
    </main>
  );
}
