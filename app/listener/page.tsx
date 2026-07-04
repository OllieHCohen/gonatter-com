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

  // Incoming conversation requests + active chats, newest first.
  const { data: convData } = await supabase
    .from("conversations")
    .select("id, state, updated_at, caller:profiles!conversations_caller_id_fkey(display_name)")
    .eq("listener_id", userId)
    .in("state", ["open", "accepted"])
    .order("updated_at", { ascending: false });
  const requests = (convData ?? []) as unknown as Array<{
    id: string;
    state: string;
    caller: { display_name: string } | null;
  }>;

  // One row per requirement, so a listener sees exactly what's missing.
  const steps: Step[] = [
    { label: "Add a profile photo", done: Boolean(lp?.photo_url), href: "/listener/onboarding", cta: "Add photo" },
    { label: "Write a few lines about you", done: Boolean(lp?.bio), href: "/listener/onboarding", cta: "Write bio" },
    { label: "Add your date of birth", done: Boolean(lp?.dob), href: "/listener/onboarding", cta: "Add DOB" },
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

      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-navy">Conversation requests</h2>
          <Link href="/messages" className="text-sm font-semibold text-teal hover:underline">
            All messages →
          </Link>
        </div>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No requests yet. When a caller reaches out, it&apos;ll appear here.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {requests.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/messages/${r.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3 hover:shadow-sm"
                >
                  <span className="font-semibold text-navy">{r.caller?.display_name ?? "Someone"}</span>
                  <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-navy">
                    {r.state === "open" ? "New request" : "Accepted"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

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
