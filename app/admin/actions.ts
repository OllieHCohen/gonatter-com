"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function resolveReport(
  reportId: string,
  state: "reviewing" | "resolved" | "dismissed",
  resolution?: string,
) {
  const { userId } = await requireAdmin();
  const admin = createAdminClient();
  await admin
    .from("reports")
    .update({
      state,
      handled_by: userId,
      resolution: resolution?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  revalidatePath("/admin");
}
