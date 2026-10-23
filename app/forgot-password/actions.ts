"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit, HOUR } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
});

export type ForgotState = { error?: string; sent?: boolean };

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://gonatter-com.vercel.app"
  ).replace(/\/$/, "");
}

export async function forgotPasswordAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Silently skip the email when over the limit, so this can't be used to
  // flood someone's inbox (and still never reveals whether the account exists).
  const ip = await clientIp();
  const email = parsed.data.email.toLowerCase();
  const allowed = await rateLimit(
    { key: `reset:ip:${ip}`, max: 5, windowSeconds: HOUR },
    { key: `reset:email:${email}`, max: 3, windowSeconds: HOUR },
  );
  if (!allowed) return { sent: true };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/reset-password`,
  });

  // Always claim success — never reveal whether an email has an account.
  return { sent: true };
}
