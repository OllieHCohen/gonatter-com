"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/browser";
import { saveListenerProfile, type ListenerProfileState } from "@/app/listener/actions";
import { minRateMinorPerMinute } from "@/lib/billing";
import { formatRate } from "@/lib/money";
import type { Interest, ListenerProfile } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Input, Textarea, Select, FieldError, Hint } from "@/components/ui/Field";

const MIN_RATE_MINOR = minRateMinorPerMinute("gbp", 10);

type Props = {
  userId: string;
  profile: ListenerProfile | null;
  interests: Interest[];
  selectedInterests: string[];
};

export function ListenerOnboarding({ userId, profile, interests, selectedInterests }: Props) {
  const [state, formAction, pending] = useActionState<ListenerProfileState, FormData>(
    saveListenerProfile,
    {},
  );
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ratePounds, setRatePounds] = useState(
    profile ? (profile.per_minute_rate_minor / 100).toFixed(2) : "0.50",
  );
  const [stripeBusy, setStripeBusy] = useState<"identity" | "connect" | null>(null);
  const [stripeError, setStripeError] = useState<{ kind: "identity" | "connect"; message: string } | null>(null);

  const rateMinor = Math.round(parseFloat(ratePounds || "0") * 100);
  const rateValid = Number.isFinite(rateMinor) && rateMinor >= MIN_RATE_MINOR;

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("listener-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("listener-photos").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch {
      setUploadError("Couldn't upload that image. Try a JPG or PNG under a few MB.");
    } finally {
      setUploading(false);
    }
  }

  async function startStripe(kind: "identity" | "connect") {
    setStripeBusy(kind);
    setStripeError(null);
    try {
      const res = await fetch(`/api/stripe/${kind}`, { method: "POST" });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url as string;
        return;
      }
      setStripeError({ kind, message: json.error ?? "Something went wrong. Please try again." });
    } catch {
      setStripeError({ kind, message: "Something went wrong. Please try again." });
    }
    setStripeBusy(null);
  }

  const idStatus = profile?.id_verified
    ? { label: "Verified", tone: "success" as const }
    : profile?.stripe_identity_status && profile.stripe_identity_status !== "pending"
      ? { label: "In review", tone: "warning" as const }
      : { label: "Not started", tone: "muted" as const };

  const payoutStatus = profile?.charges_enabled
    ? { label: "Active", tone: "success" as const }
    : profile?.stripe_account_id
      ? { label: "Incomplete", tone: "warning" as const }
      : { label: "Not started", tone: "muted" as const };

  // Exactly what stands between this listener and going live.
  const goLiveItems = [
    { label: "Profile photo", done: Boolean(photoUrl) },
    { label: "About you", done: Boolean(profile?.bio) },
    { label: "Date of birth", done: Boolean(profile?.dob) },
    { label: "Identity verified", done: Boolean(profile?.id_verified) },
    { label: "Payouts set up", done: Boolean(profile?.charges_enabled) },
  ];
  const missing = goLiveItems.filter((i) => !i.done);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Your listener profile</h1>
        <p className="mt-1 text-muted">
          This is what callers see. Be warm and genuine — you don&apos;t need to share anything you
          aren&apos;t comfortable with.
        </p>
      </div>

      {missing.length > 0 ? (
        <div className="rounded-2xl border border-warning/40 bg-warning/5 px-5 py-4">
          <p className="font-semibold text-navy">
            {missing.length === 1
              ? "One thing left before you can go live:"
              : `${missing.length} things left before you can go live:`}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {goLiveItems.map((i) => (
              <li key={i.label} className={`text-sm ${i.done ? "text-success" : "font-semibold text-navy"}`}>
                {i.done ? "✓" : "○"} {i.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-success/40 bg-success/5 px-5 py-4">
          <p className="font-semibold text-navy">
            ✓ You&apos;re all set — use the toggle on your dashboard to go live.
          </p>
        </div>
      )}

      {state.ok && (
        <p className="rounded-lg bg-success/10 px-4 py-3 text-sm font-semibold text-success">
          Profile saved.
        </p>
      )}

      <form action={formAction} className="space-y-6">
        <Card className="space-y-5">
          <div>
            <Label>Profile photo</Label>
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-line bg-mint">
                {photoUrl ? (
                  <Image src={photoUrl} alt="" width={80} height={80} className="h-20 w-20 object-cover" />
                ) : (
                  <span className="text-2xl text-muted">🙂</span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhoto}
                  disabled={uploading}
                  className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-mint file:px-4 file:py-2 file:text-sm file:font-semibold file:text-navy"
                />
                {uploading && <Hint>Uploading…</Hint>}
                {uploadError && <FieldError>{uploadError}</FieldError>}
              </div>
            </div>
            <input type="hidden" name="photo_url" value={photoUrl} />
          </div>

          <div>
            <Label htmlFor="bio">About you</Label>
            <Textarea
              id="bio"
              name="bio"
              maxLength={800}
              defaultValue={profile?.bio ?? ""}
              placeholder="A few sentences about who you are and what you're like to talk to."
            />
            <Hint>Up to 800 characters. No contact details or last names.</Hint>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="gender">Gender (optional)</Label>
              <Select id="gender" name="gender" defaultValue={profile?.gender ?? ""}>
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" name="dob" type="date" defaultValue={profile?.dob ?? ""} />
              <Hint>You must be 18 or over. Not shown to callers.</Hint>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <Label>Topics you&apos;re happy to chat about</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {interests.map((it) => (
              <label
                key={it.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-navy has-[:checked]:border-teal has-[:checked]:bg-mint"
              >
                <input
                  type="checkbox"
                  name="interests"
                  value={it.id}
                  defaultChecked={selectedInterests.includes(it.id)}
                  className="accent-teal"
                />
                {it.label}
              </label>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <Label htmlFor="rate">Your rate (£ per minute)</Label>
          <input type="hidden" name="rate_currency" value="gbp" />
          <input type="hidden" name="per_minute_rate_minor" value={rateValid ? rateMinor : ""} />
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-navy">£</span>
            <Input
              id="rate"
              type="number"
              min="0.17"
              step="0.01"
              value={ratePounds}
              onChange={(e) => setRatePounds(e.target.value)}
              className="max-w-40"
            />
            <span className="text-muted">/ min</span>
          </div>
          {rateValid ? (
            <Hint>
              Callers see {formatRate(rateMinor, "gbp")}. You keep 75% — the platform fee is 25%.
            </Hint>
          ) : (
            <FieldError>
              The minimum rate is £{(MIN_RATE_MINOR / 100).toFixed(2)}/min (the £10/hour floor).
            </FieldError>
          )}
        </Card>

        {state.error && <FieldError>{state.error}</FieldError>}

        <Button type="submit" size="lg" disabled={pending || uploading || !rateValid}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-navy">Identity verification</h2>
            <StatusBadge {...idStatus} />
          </div>
          <p className="text-sm text-muted">
            We verify every listener&apos;s ID with Stripe to keep gonatter safe. This is private and
            never shown to callers.
          </p>
          {!profile?.id_verified && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => startStripe("identity")}
              disabled={stripeBusy !== null}
            >
              {stripeBusy === "identity" ? "Redirecting…" : "Verify my identity"}
            </Button>
          )}
          {stripeError?.kind === "identity" && <FieldError>{stripeError.message}</FieldError>}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-navy">Payouts</h2>
            <StatusBadge {...payoutStatus} />
          </div>
          <p className="text-sm text-muted">
            Connect a Stripe account so we can pay out your 75% share. Powered by Stripe Connect.
          </p>
          {!profile?.charges_enabled && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => startStripe("connect")}
              disabled={stripeBusy !== null}
            >
              {stripeBusy === "connect"
                ? "Redirecting…"
                : profile?.stripe_account_id
                  ? "Finish payout setup"
                  : "Set up payouts"}
            </Button>
          )}
          {stripeError?.kind === "connect" && <FieldError>{stripeError.message}</FieldError>}
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "success" | "warning" | "muted" }) {
  const cls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/10 text-warning"
        : "bg-line/40 text-muted";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}
