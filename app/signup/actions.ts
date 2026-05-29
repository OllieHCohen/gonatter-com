"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  role: z.enum(["caller", "listener"]),
  display_name: z.string().trim().min(2, "Please enter a name").max(60),
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  country: z.string().trim().length(2).toLowerCase().default("gb"),
});

export type SignupState = { error?: string };

export async function signUpAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = schema.safeParse({
    role: formData.get("role"),
    display_name: formData.get("display_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    country: formData.get("country") || "gb",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details" };
  }
  const { role, display_name, email, password, country } = parsed.data;

  const admin = createAdminClient();

  // Auto-confirm email so signup yields an immediate session (no SMTP needed
  // for the MVP build; switch to email confirmation before public launch).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name, role },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message ?? "Could not create account";
    return { error: /already.*registered|exists/i.test(msg) ? "That email is already registered." : msg };
  }
  const uid = created.user.id;

  // Create profile + role-specific row (service role; one role per user).
  const { error: profErr } = await admin.from("profiles").insert({
    id: uid,
    role,
    display_name,
    country,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(uid); // roll back the orphaned auth user
    return { error: "Could not set up your profile. Please try again." };
  }
  if (role === "listener") {
    await admin.from("listener_profiles").insert({ profile_id: uid });
  } else {
    await admin.from("caller_profiles").insert({ profile_id: uid });
  }

  // Establish a browser session via cookies.
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) return { error: "Account created — please log in." };

  redirect("/verify-phone");
}
