"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BlockResult = { ok?: boolean; error?: string };

// Block someone: stops ALL new communication (messages and calls) in both
// directions. RLS only lets a user write rows where they are the blocker.
export async function blockUser(otherId: string): Promise<BlockResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  if (!otherId || otherId === user.id) return { error: "You can't block yourself." };

  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: user.id, blocked_id: otherId });
  if (error && error.code !== "23505") return { error: "Couldn't block. Try again." };

  revalidatePath("/blocked");
  revalidatePath("/messages");
  return { ok: true };
}

export async function unblockUser(otherId: string): Promise<BlockResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", otherId);
  if (error) return { error: "Couldn't unblock. Try again." };

  revalidatePath("/blocked");
  revalidatePath("/messages");
  return { ok: true };
}
