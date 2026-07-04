import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/money";
import { countryName } from "@/lib/countries";
import { cn } from "@/lib/cn";

type ProfileRow = {
  id: string;
  role: "caller" | "listener" | "admin";
  display_name: string;
  country: string | null;
  phone_verified: boolean;
  status: "active" | "suspended" | "banned";
  is_admin: boolean;
  created_at: string;
};

type ListenerRow = {
  profile_id: string;
  available: boolean;
  id_verified: boolean;
  rating_avg: number;
  rating_count: number;
};

type AuthInfo = { email: string | null; lastSignInAt: string | null; emailConfirmed: boolean };

// UK-style timestamp: "today 14:21", else "04/07/2026".
function when(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `today ${time}` : `${d.toLocaleDateString("en-GB")} ${time}`;
}

function Chip({ tone, children }: { tone: "good" | "warn" | "bad" | "plain"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "good" && "bg-success/10 text-success",
        tone === "warn" && "bg-sunshine/20 text-navy",
        tone === "bad" && "bg-error/10 text-error",
        tone === "plain" && "bg-mint text-navy",
      )}
    >
      {children}
    </span>
  );
}

export default async function AdminUsers() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: profileRows }, { data: listenerRows }, { data: callerRows }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, role, display_name, country, phone_verified, status, is_admin, created_at")
      .order("created_at", { ascending: false }),
    admin.from("listener_profiles").select("profile_id, available, id_verified, rating_avg, rating_count"),
    admin.from("caller_profiles").select("profile_id, credit_minor"),
  ]);

  const profiles = (profileRows ?? []) as ProfileRow[];
  const listeners = new Map(((listenerRows ?? []) as ListenerRow[]).map((l) => [l.profile_id, l]));
  const credits = new Map(
    ((callerRows ?? []) as { profile_id: string; credit_minor: number }[]).map((c) => [c.profile_id, c.credit_minor]),
  );

  // Email + sign-in activity live in auth.users — page through the admin API.
  const auth = new Map<string, AuthInfo>();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    for (const u of data.users) {
      auth.set(u.id, {
        email: u.email ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        emailConfirmed: Boolean(u.email_confirmed_at),
      });
    }
    if (data.users.length < 1000) break;
  }

  const callerCount = profiles.filter((p) => p.role === "caller").length;
  const listenerCount = profiles.filter((p) => p.role === "listener").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Users</h1>
        <p className="mt-1 text-muted">
          {`${profiles.length} accounts — ${callerCount} callers, ${listenerCount} listeners. Newest first.`}
        </p>
      </div>

      <div className="space-y-3">
        {profiles.map((p) => {
          const a = auth.get(p.id);
          const lp = p.role === "listener" ? listeners.get(p.id) : undefined;
          const credit = p.role === "caller" ? credits.get(p.id) : undefined;
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy">
                    {p.display_name}
                    {p.country && (
                      <span className="ml-2 text-xs font-normal text-muted">{countryName(p.country)}</span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted">{a?.email ?? "no email on file"}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Chip tone="plain">{p.role}</Chip>
                  {(p.is_admin || p.role === "admin") && <Chip tone="warn">admin</Chip>}
                  <Chip tone={p.status === "active" ? "good" : "bad"}>{p.status}</Chip>
                  {lp && (
                    <>
                      <Chip tone={lp.available ? "good" : "plain"}>{lp.available ? "live" : "not live"}</Chip>
                      <Chip tone={lp.id_verified ? "good" : "warn"}>
                        {lp.id_verified ? "ID verified" : "no ID check"}
                      </Chip>
                      {lp.rating_count > 0 && (
                        <Chip tone="plain">{`★ ${lp.rating_avg.toFixed(1)} (${lp.rating_count})`}</Chip>
                      )}
                    </>
                  )}
                  {credit !== undefined && credit > 0 && (
                    <Chip tone="plain">{`credit ${formatMoney(credit, "gbp")}`}</Chip>
                  )}
                  {a && !a.emailConfirmed && <Chip tone="warn">email unconfirmed</Chip>}
                  {p.phone_verified && <Chip tone="good">phone ✓</Chip>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-2 text-xs text-muted">
                <span>{`Joined ${when(p.created_at)}`}</span>
                <span className={a?.lastSignInAt ? "" : "text-error"}>
                  {`Last sign-in ${when(a?.lastSignInAt ?? null)}`}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
