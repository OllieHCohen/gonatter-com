import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/ui/Card";
import { NOT_A_CRISIS, WHAT_IS } from "@/lib/copy";
import type { CrisisResource } from "@/lib/types";

export const metadata = { title: "Support resources — gonatter" };

export default async function SupportPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crisis_resources")
    .select("*")
    .order("sort_order", { ascending: true });
  const resources = (data ?? []) as CrisisResource[];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <h1 className="font-display text-3xl font-bold text-navy">Support resources</h1>

        <Card className="mt-6 border-warning/40 bg-warning/5">
          <p className="text-navy">{NOT_A_CRISIS}</p>
        </Card>

        <p className="mt-6 max-w-2xl text-muted">{WHAT_IS.body}</p>

        <h2 className="mt-10 font-display text-xl font-bold text-navy">If you need urgent help</h2>
        <div className="mt-4 space-y-3">
          {resources.map((r) => (
            <Card key={r.id}>
              <h3 className="font-display text-lg font-bold text-navy">{r.name}</h3>
              {r.notes && <p className="mt-1 text-sm text-muted">{r.notes}</p>}
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {r.phone && (
                  <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="font-semibold text-teal hover:underline">
                    Call {r.phone}
                  </a>
                )}
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-teal hover:underline"
                  >
                    Visit website
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
