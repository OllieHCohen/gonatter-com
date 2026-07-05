"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type StatusResult = { ok?: boolean; error?: string };

// Suspend, ban or reinstate an account. Alongside profiles.status (which every
// page guard checks), we ban/unban the auth user so suspended people can't
// sign in again or refresh their session.
export async function setUserStatus(
  profileId: string,
  status: "active" | "suspended" | "banned",
): Promise<StatusResult> {
  const { userId } = await requireAdmin();
  if (!["active", "suspended", "banned"].includes(status)) return { error: "Invalid status." };
  if (profileId === userId) return { error: "You can't change your own account status." };

  const admin = createAdminClient();

  const { error } = await admin.from("profiles").update({ status }).eq("id", profileId);
  if (error) return { error: "Couldn't update the account. Try again." };

  // ~100 years for suspended/banned; "none" lifts the ban on reinstatement.
  const { error: banErr } = await admin.auth.admin.updateUserById(profileId, {
    ban_duration: status === "active" ? "none" : "876000h",
  });
  if (banErr) {
    // Profile flag is set (pages are locked) — surface that login-ban failed.
    return { error: "Account flagged, but the sign-in ban failed — try again." };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}
