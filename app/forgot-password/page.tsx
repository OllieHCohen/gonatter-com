"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type ForgotState } from "./actions";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Field";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(forgotPasswordAction, {});

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8 text-center">
        <Logo variant="light" size="lg" />
        <h1 className="mt-6 text-3xl font-bold text-navy">Reset your password</h1>
        <p className="mt-2 text-muted">
          Enter your email and we&apos;ll send you a link to choose a new one.
        </p>
      </div>

      {state.sent ? (
        <div className="rounded-2xl bg-mint px-5 py-6 text-center">
          <p className="font-semibold text-navy">Check your inbox</p>
          <p className="mt-2 text-sm text-muted">
            If that email has a gonatter account, a reset link is on its way. It can take a minute
            or two — check your spam folder as well.
          </p>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <FieldError>{state.error}</FieldError>
          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-teal hover:underline">
          Back to log in
        </Link>
      </p>
    </main>
  );
}
