import type { SupabaseClient } from "@supabase/supabase-js";

// Block state between two people, read with the service-role client so it sees
// both directions (users can only read their own list under RLS).
export async function blockState(
  admin: SupabaseClient,
  userId: string,
  otherId: string,
): Promise<{ blockedByMe: boolean; blockedMe: boolean }> {
  const { data } = await admin
    .from("blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${userId})`,
    );
  const rows = (data ?? []) as { blocker_id: string }[];
  return {
    blockedByMe: rows.some((r) => r.blocker_id === userId),
    blockedMe: rows.some((r) => r.blocker_id === otherId),
  };
}

// The message shown to whoever tries to get in touch across a block. The same
// wording is used whichever side blocked — we never announce "they blocked you".
export const BLOCKED_CONTACT_ERROR = "You can't contact this person.";
export const BLOCKED_BY_ME_ERROR =
  "You've blocked this person. Unblock them from your blocked list if you want to get back in touch.";
