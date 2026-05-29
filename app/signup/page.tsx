"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUpAction, type SignupState } from "./actions";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, FieldError, Hint } from "@/components/ui/Field";
import { COUNTRIES } from "@/lib/countries";
import { AGE_GATE } from "@/lib/copy";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const params = useSearchParams();
  const initialRole = params.get("role") === "listener" ? "listener" : "caller";
  const [role, setRole] = useState<"caller" | "listener">(initialRole);
  const [state, action, pending] = useActionState<SignupState, FormData>(signUpAction, {});

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8 text-center">
        <Logo variant="light" size="lg" />
        <h1 className="mt-6 text-3xl font-bold text-navy">Join gonatter</h1>
        <p className="mt-2 text-muted">Warm conversation with real people. No pressure.</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="role" value={role} />

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-mint p-1.5">
          <RoleTab active={role === "caller"} onClick={() => setRole("caller")}>
            I want to talk
          </RoleTab>
          <RoleTab active={role === "listener"} onClick={() => setRole("listener")}>
            I want to listen
          </RoleTab>
        </div>

        <div>
          <Label htmlFor="display_name">Your name</Label>
          <Input id="display_name" name="display_name" autoComplete="name" required placeholder="How should people know you?" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Select id="country" name="country" defaultValue="gb">
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <FieldError>{state.error}</FieldError>

        <Button type="submit" size="lg" disabled={pending} className="mt-2">
          {pending ? "Creating your account…" : "Create account"}
        </Button>
        <Hint>{AGE_GATE}</Hint>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-teal hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}

function RoleTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
        active ? "bg-white text-navy shadow-sm" : "text-muted hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}
