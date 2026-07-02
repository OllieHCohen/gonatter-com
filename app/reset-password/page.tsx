"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError, Hint } from "@/components/ui/Field";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // The session is normally established by /auth/confirm (server-side
  // token_hash verification) before we land here. The ?code= exchange path is
  // kept for same-browser PKCE links; ?error= means the link was bad.
  useEffect(() => {
    const supabase = createClient();
    const code = params.get("code");
    (async () => {
      if (params.get("error")) {
        setLinkError(true);
        return;
      }
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          setLinkError(true);
          return;
        }
        setReady(true);
        return;
      }
      // No code — maybe the session already exists (hash-token flow or re-visit).
      const { data } = await supabase.auth.getUser();
      if (data.user) setReady(true);
      else setLinkError(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    router.push("/post-auth");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8 text-center">
        <Logo variant="light" size="lg" />
        <h1 className="mt-6 text-3xl font-bold text-navy">Choose a new password</h1>
      </div>

      {linkError ? (
        <div className="rounded-2xl bg-mint px-5 py-6 text-center">
          <p className="font-semibold text-navy">This link has expired or already been used.</p>
          <p className="mt-2 text-sm text-muted">
            Reset links only work once.{" "}
            <Link href="/forgot-password" className="font-semibold text-teal hover:underline">
              Request a new one
            </Link>
            .
          </p>
        </div>
      ) : !ready ? (
        <p className="text-center text-muted">Checking your link…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Hint>Use at least 8 characters.</Hint>
          </div>
          <FieldError>{error}</FieldError>
          <Button size="lg" onClick={save} disabled={busy || password.length < 8}>
            {busy ? "Saving…" : "Save new password"}
          </Button>
        </div>
      )}
    </main>
  );
}
