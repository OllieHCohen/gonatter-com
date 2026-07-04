import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { formatRate } from "@/lib/money";
import { WHAT_IS } from "@/lib/copy";

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

export default async function DiscoverPage() {
  await requireRole("caller");
  const supabase = await createClient();
  const { data } = await supabase
    .from("listener_profiles")
    .select(
      "profile_id, bio, photo_url, per_minute_rate_minor, rate_currency, rating_avg, rating_count, profiles!inner(display_name, country)",
    )
    .eq("id_verified", true)
    .eq("available", true)
    .order("rating_avg", { ascending: false });

  const listeners = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-3xl font-bold text-navy">{WHAT_IS.heading}</h1>
        <p className="mt-2 max-w-2xl text-muted">{WHAT_IS.body}</p>
      </section>

      {listeners.length === 0 ? (
        <Card>
          <p className="text-muted">
            No listeners are available right now. Please check back in a little while — people come
            online throughout the day.
          </p>
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
                    {l.rating_count > 0 && (
                      <p className="text-xs text-muted">
                        {l.rating_avg.toFixed(1)} ★ ({l.rating_count})
                      </p>
                    )}
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
