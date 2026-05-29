"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { homePathForRole } from "@/lib/auth";
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "That email or password doesn't match." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, phone_verified")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) redirect("/signup");
  if (!profile.phone_verified) redirect("/verify-phone");
  redirect(homePathForRole(profile.role as UserRole));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
