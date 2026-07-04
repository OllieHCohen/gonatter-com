"use server";

import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  description: z.string().trim().min(5, "Tell us a little more about what happened.").max(4000),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  pageUrl: z.string().trim().max(2000),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type BugReportInput = z.input<typeof schema>;
export type BugReportResult = { ok?: boolean; error?: string };

// Cap every captured value so a hostile client can't stuff megabytes of JSON.
function sanitiseContext(raw: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw) return out;
  for (const [key, value] of Object.entries(raw).slice(0, 24)) {
    const k = key.slice(0, 64);
    if (Array.isArray(value)) {
      out[k] = value.slice(0, 5).map((v) => String(v).slice(0, 500));
    } else {
      out[k] = String(value).slice(0, 500);
    }
  }
  return out;
}

export async function submitBugReport(input: BugReportInput): Promise<BugReportResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  }

  const session = await getSessionProfile();
  const context = sanitiseContext(parsed.data.context);
  if (session?.profile) {
    context.reporter_role = session.profile.role;
    context.reporter_name = session.profile.display_name;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("bug_reports").insert({
    reporter_id: session?.userId ?? null,
    reporter_email: parsed.data.email || session?.email || null,
    description: parsed.data.description,
    page_url: parsed.data.pageUrl,
    context,
  });
  if (error) return { error: "Couldn't save your report just now. Please try again." };
  return { ok: true };
}
