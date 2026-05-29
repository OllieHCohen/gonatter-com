import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { Interest, ListenerProfile } from "@/lib/types";
import { ListenerOnboarding } from "@/components/listener/ListenerOnboarding";

export default async function ListenerOnboardingPage() {
  const { userId } = await requireRole("listener");
  const supabase = await createClient();

  const [{ data: lp }, { data: interests }, { data: mine }] = await Promise.all([
    supabase.from("listener_profiles").select("*").eq("profile_id", userId).single(),
    supabase.from("interests").select("*").order("sort_order"),
    supabase.from("listener_interests").select("interest_id").eq("listener_id", userId),
  ]);

  const selectedInterests = (mine ?? []).map((r) => r.interest_id as string);

  return (
    <ListenerOnboarding
      userId={userId}
      profile={lp as ListenerProfile}
      interests={(interests ?? []) as Interest[]}
      selectedInterests={selectedInterests}
    />
  );
}
