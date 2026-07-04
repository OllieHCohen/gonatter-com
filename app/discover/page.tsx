import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { formatRate } from "@/lib/money";
import { WHAT_IS, FREE_MINUTES } from "@/lib/copy";
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
  await requireRole("caller");
  const filters = await searchParams;
  const minRating = Number(filters.rating) || 0;
  const supabase = await createClient();

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

  const listeners = (data ?? []) as unknown as Row[];
  const interests = (interestRows ?? []) as { id: string; label: string }[];
  const countryCodes = Array.from(
    new Set(
      ((liveCountries ?? []) as unknown as { profiles: { country: string | null } | null }[])
        .map((r) => r.profiles?.country)
        .filter((c): c is string => Boolean(c)),
    ),
  );
  const hasFilters = Boolean(filters.country || filters.topic || minRating > 0);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold text-navy">{WHAT_IS.heading}</h1>
        <p className="mt-2 max-w-2xl text-muted">{WHAT_IS.body}</p>
        <p className="mt-4 w-fit rounded-full bg-success/15 px-5 py-2.5 font-semibold text-success">
          🎁 {FREE_MINUTES.badge} on every call — only pay once you know you&apos;ve clicked
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
          {listeners.map((l) => (
            <Link key={l.profile_id} href={`/discover/${l.profile_id}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-mint">
                    {l.photo_url ? (
                      <Image
                        src={l.photo_url}
                        alt=""
                        width={64}
                        height={64}
                        className="h-16 w-16 object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🙂</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-bold text-navy">
                      {l.profiles?.display_name}
                    </h2>
                    <p className="text-sm font-semibold text-teal">
                      {formatRate(l.per_minute_rate_minor, l.rate_currency)}
                    </p>
                    <p className="text-sm">
                      {l.rating_count > 0 ? (
                        <span className="font-semibold text-sunshine">
                          {"★".repeat(Math.round(l.rating_avg))}
                          <span className="ml-1 text-xs font-normal text-muted">
                            {l.rating_avg.toFixed(1)} ({l.rating_count})
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted">New — no ratings yet</span>
                      )}
                    </p>
                  </div>
                </div>
                {l.bio && <p className="mt-4 line-clamp-3 text-sm text-muted">{l.bio}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
