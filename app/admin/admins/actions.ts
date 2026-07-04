"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminGrantState = { error?: string; done?: string };

const schema = z.object({ email: z.string().trim().email("Enter a valid email") });

export async function grantAdminAction(
  _prev: AdminGrantState,
  formData: FormData,
): Promise<AdminGrantState> {
  const { profile } = await requireAdmin();
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const email = parsed.data.email.toLowerCase();

  const admin = createAdminClient();
  // Look the user up in auth by email, then flip the profile flag.
  const { data: page } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = page?.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) return { error: "No account exists with that email." };

  const { error } = await admin.from("profiles").update({ is_admin: true }).eq("id", user.id);
  if (error) return { error: "Couldn't update that account. Try again." };

  revalidatePath("/admin/admins");
  return { done: `${email} is now an admin (granted by ${profile.display_name}).` };
}

export async function revokeAdminAction(profileId: string) {
  const { userId } = await requireAdmin();
  if (profileId === userId) return; // can't demote yourself — avoids lockouts
  const admin = createAdminClient();
  await admin.from("profiles").update({ is_admin: false }).eq("id", profileId);
  revalidatePath("/admin/admins");
}
