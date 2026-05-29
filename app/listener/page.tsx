import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { formatRate } from "@/lib/money";
import type { ListenerProfile } from "@/lib/types";
import { AvailabilityToggle } from "@/components/listener/AvailabilityToggle";

type Step = { label: string; done: boolean; href: string; cta: string };

export default async function ListenerDashboard() {
  const { userId, profile } = await requireRole("listener");
  const supabase = await createClient();
  const { data } = await supabase
    .from("listener_profiles")
    .select("*")
    .eq("profile_id", userId)
    .single();
  const lp = data as ListenerProfile | null;

  const hasProfile = Boolean(lp?.bio && lp?.photo_url && lp?.dob);
  const steps: Step[] = [
    { label: "Complete your profile", done: hasProfile, href: "/listener/onboarding", cta: "Edit profile" },
    { label: "Verify your identity", done: Boolean(lp?.id_verified), href: "/listener/onboarding", cta: "Verify ID" },
    { label: "Set up payouts", done: Boolean(lp?.charges_enabled), href: "/listener/onboarding", cta: "Set up payouts" },
  ];
  const ready = steps.every((s) => s.done);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">Hi, {profile.display_name}</h1>
          <p className="mt-1 text-muted">Your listener dashboard.</p>
        </div>
        {ready && lp && <AvailabilityToggle initial={lp.available} />}
      </div>

      {!ready && (
        <Card className="border-warning/40 bg-warning/5">
          <h2 className="font-display text-lg font-bold text-navy">Finish setting up</h2>
          <p className="mt-1 text-sm text-muted">
            Complete these steps before you can go live and take calls.
          </p>
          <ul className="mt-4 space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-3 text-navy">
                  <span
                    className={
                      s.done
                        ? "grid h-6 w-6 place-items-center rounded-full bg-success text-xs text-white"
                        : "grid h-6 w-6 place-items-center rounded-full border border-line text-xs text-muted"
                    }
                  >
                    {s.done ? "✓" : ""}
                  </span>
                  <span className={s.done ? "line-through opacity-60" : "font-semibold"}>{s.label}</span>
                </span>
                {!s.done && (
                  <Link href={s.href} className="text-sm font-semibold text-teal hover:underline">
                    {s.cta} →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-bold text-navy">Your rate</h2>
          {lp ? (
            <p className="mt-2 text-2xl font-bold text-teal">
              {formatRate(lp.per_minute_rate_minor, lp.rate_currency)}
            </p>
          ) : (
            <p className="mt-2 text-muted">Not set yet.</p>
          )}
          <ButtonLink href="/listener/onboarding" variant="secondary" className="mt-4">
            Edit profile & rate
          </ButtonLink>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold text-navy">Your stats</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted">Calls taken</dt>
              <dd className="text-2xl font-bold text-navy">{lp?.calls_count ?? 0}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Rating</dt>
              <dd className="text-2xl font-bold text-navy">
                {lp && lp.rating_count > 0 ? `${lp.rating_avg.toFixed(1)} ★` : "—"}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
