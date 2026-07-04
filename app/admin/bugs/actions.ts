"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BugReportStatus } from "@/lib/types";

const STATUSES: BugReportStatus[] = ["new", "in_progress", "resolved", "dismissed"];

export async function setBugStatus(bugId: string, status: BugReportStatus) {
  await requireAdmin();
  if (!STATUSES.includes(status)) return;
  const admin = createAdminClient();
  await admin.from("bug_reports").update({ status }).eq("id", bugId);
  revalidatePath("/admin/bugs");
}
