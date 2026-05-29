import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatRate } from "@/lib/money";
import { PLATONIC_REMINDER, SPEND_CAP } from "@/lib/copy";
import { startConversation } from "@/app/discover/actions";

type Params = { params: Promise<{ id: string }> };

export default async function ListenerDetail({ params }: Params) {
  const { id } = await params;
  const { userId } = await requireRole("caller");
  const supabase = await createClient();

  const [{ data: lp }, { data: cp }, { data: li }] = await Promise.all([
    supabase
      .from("listener_profiles")
      .select(
        "profile_id, bio, gender, photo_url, per_minute_rate_minor, rate_currency, rating_avg, rating_count, calls_count, available, id_verified, charges_enabled, profiles!inner(display_name, country)",
      )
      .eq("profile_id", id)
      .single(),
    supabase.from("caller_profiles").select("seen_platonic_reminder").eq("profile_id", userId).single(),
    supabase
      .from("listener_interests")
      .select("interests(label)")
      .eq("listener_id", id),
  ]);

  if (!lp) notFound();

  const p = lp as unknown as {
    profile_id: string;
    bio: string | null;
    gender: string | null;
    photo_url: string | null;
    per_minute_rate_minor: number;
    rate_currency: string;
    rating_avg: number;
    rating_count: number;
    calls_count: number;
    available: boolean;
    id_verified: boolean;
    charges_enabled: boolean;
    profiles: { display_name: string; country: string | null };
  };
  const live = p.id_verified && p.charges_enabled && p.available;
  const topics = ((li ?? []) as unknown as { interests: { label: string } | null }[])
    .map((r) => r.interests?.label)
    .filter(Boolean) as string[];
  const firstTime = !cp?.seen_platonic_reminder;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ButtonLink href="/discover" variant="ghost" className="-ml-2">
        ← Back
      </ButtonLink>

      <Card>
        <div className="flex items-start gap-5">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-mint">
            {p.photo_url ? (
              <Image src={p.photo_url} alt="" width={96} height={96} className="h-24 w-24 object-cover" />
            ) : (
              <span className="text-3xl">🙂</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-navy">{p.profiles.display_name}</h1>
            <p className="mt-1 text-lg font-semibold text-teal">
              {formatRate(p.per_minute_rate_minor, p.rate_currency)}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
              {p.rating_count > 0 && <span>{p.rating_avg.toFixed(1)} ★ ({p.rating_count})</span>}
              {p.calls_count > 0 && <span>{p.calls_count} calls</span>}
              <span className={live ? "text-success" : "text-muted"}>
                {live ? "● Available now" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {p.bio && <p className="mt-5 whitespace-pre-line text-navy">{p.bio}</p>}

        {topics.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {topics.map((t) => (
              <span key={t} className="rounded-full bg-mint px-3 py-1 text-sm text-navy">
                {t}
              </span>
            ))}
          </div>
        )}
      </Card>

      {firstTime && (
        <Card className="border-lavender/40 bg-lavender/5">
          <p className="text-sm text-navy">{PLATONIC_REMINDER}</p>
        </Card>
      )}

      <Card className="space-y-4">
        <p className="text-sm text-muted">{SPEND_CAP}</p>
        <form action={startConversation}>
          <input type="hidden" name="listener_id" value={p.profile_id} />
          <Button type="submit" size="lg" className="w-full">
            Say hi — start a conversation
          </Button>
        </form>
        <p className="text-center text-xs text-muted">
          You won&apos;t be charged for messaging. Charges only apply during a call.
        </p>
      </Card>
    </div>
  );
}
