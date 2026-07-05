import { requireRole } from "@/lib/auth";
import { VoiceBackdrop } from "@/components/VoiceBackdrop";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { TopUpForm } from "@/components/credit/TopUpForm";
import { formatMoney } from "@/lib/money";

type Txn = {
  id: string;
  amount_minor: number;
  currency: string;
  kind: string;
  created_at: string;
};

const KIND_LABEL: Record<string, string> = {
  topup: "Top-up",
  call_charge: "Call",
  refund: "Refund",
};

export default async function CreditPage() {
  const { userId } = await requireRole("caller");
  const supabase = await createClient();

  const [{ data: cp }, { data: txns }] = await Promise.all([
    supabase.from("caller_profiles").select("credit_minor").eq("profile_id", userId).single(),
    supabase
      .from("credit_transactions")
      .select("id, amount_minor, currency, kind, created_at")
      .eq("caller_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const balance = (cp?.credit_minor as number | null) ?? 0;
  const history = (txns ?? []) as Txn[];

  return (
    <div className="relative space-y-6">
      <VoiceBackdrop />
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Call credit</h1>
        <p className="mt-1 text-muted">
          Top up once and start calls instantly — no card step each time. Calls use your credit
          first whenever it covers the call block.
        </p>
      </div>

      <Card className="text-center">
        <p className="text-sm font-semibold text-muted">Your balance</p>
        <p className="mt-1 font-display text-4xl font-bold text-teal">{formatMoney(balance, "gbp")}</p>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold text-navy">Add credit</h2>
        <TopUpForm />
      </Card>

      {history.length > 0 && (
        <Card>
          <h2 className="font-display text-lg font-bold text-navy">Recent activity</h2>
          <ul className="mt-3 divide-y divide-line/60">
            {history.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-navy">
                  {KIND_LABEL[t.kind] ?? t.kind}
                  <span className="ml-2 text-xs text-muted">
                    {new Date(t.created_at).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <span className={`font-semibold ${t.amount_minor >= 0 ? "text-success" : "text-navy"}`}>
                  {t.amount_minor >= 0 ? "+" : ""}
                  {formatMoney(t.amount_minor, t.currency)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
