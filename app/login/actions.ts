"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit, HOUR } from "@/lib/rate-limit";
import { homePathForRole, phoneVerificationRequired } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(1, "Please enter your password"),
});

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Slow down password guessing.
  const ip = await clientIp();
  const allowed = await rateLimit(
    { key: `login:ip:${ip}`, max: 30, windowSeconds: HOUR },
    { key: `login:email:${parsed.data.email.toLowerCase()}`, max: 10, windowSeconds: HOUR },
  );
  if (!allowed) return { error: "Too many sign-in attempts. Please wait a while and try again." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "That email or password doesn't match." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, phone_verified")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) redirect("/signup");
  if (!profile.phone_verified && phoneVerificationRequired()) redirect("/verify-phone");
  redirect(homePathForRole(profile.role as UserRole));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
