"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  subject_id: z.string().uuid().optional().or(z.literal("")),
  call_session_id: z.string().uuid().optional().or(z.literal("")),
  category: z.enum(["distress_self_harm", "sexual_adult", "abuse_harassment", "scam_fraud", "csam", "other"]),
  body: z.string().trim().max(2000).optional(),
});

export type ReportState = { error?: string; ok?: boolean };

export async function fileReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = schema.safeParse({
    subject_id: formData.get("subject_id") || "",
    call_session_id: formData.get("call_session_id") || "",
    category: formData.get("category"),
    body: formData.get("body") || undefined,
  });
  if (!parsed.success) return { error: "Please choose a reason." };
  const v = parsed.data;

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    subject_id: v.subject_id || null,
    call_session_id: v.call_session_id || null,
    category: v.category,
    body: v.body ?? null,
  });
  if (error) return { error: "Couldn't submit your report. Please try again." };

  return { ok: true };
}
