import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { formatRate } from "@/lib/money";
import { WHAT_IS, FREE_MINUTES } from "@/lib/copy";
import { VoiceBackdrop } from "@/components/VoiceBackdrop";
import { countryName } from "@/lib/countries";
import { cn } from "@/lib/cn";

type Row = {
  profile_id: string;
  bio: string | null;
  photo_url: string | null;
  per_minute_rate_minor: number;
  rate_currency: string;
  rating_avg: number;
  rating_count: number;
  profiles: { display_name: string; country: string | null } | null;
};

type Filters = { country?: string; topic?: string; rating?: string };

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "3", label: "3★ +" },
  { value: "4", label: "4★ +" },
];

function filterHref(current: Filters, patch: Partial<Filters>): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.country) params.set("country", next.country);
  if (next.topic) params.set("topic", next.topic);
  if (next.rating) params.set("rating", next.rating);
  const qs = params.toString();
  return qs ? `/discover?${qs}` : "/discover";
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
        active ? "border-teal bg-teal text-white" : "border-line bg-white text-navy hover:border-teal",
      )}
    >
      {children}
    </Link>
  );
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const { userId } = await requireRole("caller");
  const filters = await searchParams;
  const minRating = Number(filters.rating) || 0;
  const supabase = await createClient();

  // Hide anyone in a block relationship with this caller, in either direction.
  const { data: blockRows } = await createAdminClient()
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  const hiddenIds = new Set(
    ((blockRows ?? []) as { blocker_id: string; blocked_id: string }[]).map((b) =>
      b.blocker_id === userId ? b.blocked_id : b.blocker_id,
    ),
  );

  // Base query: live listeners, optionally narrowed by the active filters.
  // listener_interests hangs off profiles (not listener_profiles), so the
  // topic filter has to join through the nested profiles embed.
  let query = supabase
    .from("listener_profiles")
    .select(
      `profile_id, bio, photo_url, per_minute_rate_minor, rate_currency, rating_avg, rating_count, profiles!inner(display_name, country${
        filters.topic ? ", listener_interests!inner(interest_id)" : ""
      })`,
    )
    .eq("id_verified", true)
    .eq("available", true);
  if (filters.country) query = query.eq("profiles.country", filters.country);
  if (filters.topic) query = query.eq("profiles.listener_interests.interest_id", filters.topic);
  if (minRating > 0) query = query.gte("rating_avg", minRating);

  const [{ data }, { data: interestRows }, { data: liveCountries }] = await Promise.all([
    query.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false }),
    supabase.from("interests").select("id, label").order("sort_order"),
    supabase
      .from("listener_profiles")
      .select("profiles!inner(country)")
      .eq("id_verified", true)
      .eq("available", true),
  ]);

  const listeners = ((data ?? []) as unknown as Row[]).filter((l) => !hiddenIds.has(l.profile_id));
  const interests = (interestRows ?? []) as { id: string; label: string }[];

  // Topic chips for each card, fetched in one go for the listed listeners.
  const topicsByListener = new Map<string, string[]>();
  if (listeners.length > 0) {
    const { data: li } = await supabase
      .from("listener_interests")
      .select("listener_id, interests(label)")
      .in(
        "listener_id",
        listeners.map((l) => l.profile_id),
      );
    for (const row of (li ?? []) as unknown as { listener_id: string; interests: { label: string } | null }[]) {
      if (!row.interests?.label) continue;
      const list = topicsByListener.get(row.listener_id) ?? [];
      list.push(row.interests.label);
      topicsByListener.set(row.listener_id, list);
    }
  }
  const countryCodes = Array.from(
    new Set(
      ((liveCountries ?? []) as unknown as { profiles: { country: string | null } | null }[])
        .map((r) => r.profiles?.country)
        .filter((c): c is string => Boolean(c)),
    ),
  );
  const hasFilters = Boolean(filters.country || filters.topic || minRating > 0);

  return (
    <div className="relative space-y-8">
      <VoiceBackdrop />
      <section>
        <h1 className="font-display text-3xl font-bold text-navy">{WHAT_IS.heading}</h1>
        <p className="mt-2 max-w-2xl text-muted">{WHAT_IS.body}</p>
        <p className="mt-4 w-fit rounded-full bg-success/15 px-5 py-2.5 font-semibold text-success">
          {`🎁 ${FREE_MINUTES.badge} on every call — only pay once you know you've clicked`}
        </p>
      </section>

      <section className="space-y-3">
        {countryCodes.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-muted">Where</span>
            <FilterChip href={filterHref(filters, { country: undefined })} active={!filters.country}>
              Anywhere
            </FilterChip>
            {countryCodes.map((code) => (
              <FilterChip
                key={code}
                href={filterHref(filters, { country: code })}
                active={filters.country === code}
              >
                {countryName(code)}
              </FilterChip>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-muted">Topics</span>
          <FilterChip href={filterHref(filters, { topic: undefined })} active={!filters.topic}>
            Anything
          </FilterChip>
          {interests.map((it) => (
            <FilterChip key={it.id} href={filterHref(filters, { topic: it.id })} active={filters.topic === it.id}>
              {it.label}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-muted">Rating</span>
          {RATING_OPTIONS.map((o) => (
            <FilterChip
              key={o.value || "any"}
              href={filterHref(filters, { rating: o.value || undefined })}
              active={(filters.rating ?? "") === o.value}
            >
              {o.label}
            </FilterChip>
          ))}
        </div>
      </section>

      {listeners.length === 0 ? (
        <Card>
          <p className="text-muted">
            {hasFilters
              ? "No listeners match those filters right now — try widening them."
              : "No listeners are available right now. Please check back in a little while — people come online throughout the day."}
          </p>
          {hasFilters && (
            <Link href="/discover" className="mt-3 inline-block font-semibold text-teal hover:underline">
              Clear filters
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listeners.map((l, i) => {
            const name = l.profiles?.display_name ?? "Someone";
            const tone = ["bg-teal", "bg-coral", "bg-navy"][i % 3];
            const topics = topicsByListener.get(l.profile_id) ?? [];
            return (
              <Link key={l.profile_id} href={`/discover/${l.profile_id}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <div className="flex items-center gap-4">
                    {l.photo_url ? (
                      <Image
                        src={l.photo_url}
                        alt=""
                        width={64}
                        height={64}
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${tone} font-display text-2xl font-bold text-white`}
                      >
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-bold text-navy">{name}</h2>
                      <p className="text-sm">
                        {l.rating_count > 0 ? (
                          <>
                            <span className="font-semibold text-sunshine">★</span>
                            <span className="ml-1 font-semibold text-navy">{l.rating_avg.toFixed(1)}</span>
                            <span className="ml-1 text-xs text-muted">({l.rating_count})</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted">New</span>
                        )}
                        <span className="ml-2 font-semibold text-teal">
                          {formatRate(l.per_minute_rate_minor, l.rate_currency)}
                        </span>
                      </p>
                    </div>
                  </div>
                  {topics.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {topics.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-full bg-mint px-3 py-1 text-sm text-navy">
                          {t}
                        </span>
                      ))}
                      {topics.length > 3 && (
                        <span className="rounded-full bg-mint px-3 py-1 text-sm text-muted">
                          +{topics.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  {l.bio && <p className="mt-3 line-clamp-2 text-sm text-muted">{l.bio}</p>}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
