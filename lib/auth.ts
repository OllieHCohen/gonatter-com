import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

// The signed-in auth user, or null.
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Auth user + their profile row, or null if not signed in / no profile yet.
export async function getSessionProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return { userId: user.id, email: user.email ?? null, profile: profile as Profile | null };
}

// Guard: require a signed-in user; redirect to login otherwise.
export async function requireUser() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  return session;
}

// Guard: require a specific role.
export async function requireRole(role: UserRole) {
  const session = await requireUser();
  if (!session.profile) redirect("/signup");
  if (session.profile.role !== role) redirect(homePathForRole(session.profile.role));
  return session as { userId: string; email: string | null; profile: Profile };
}

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "listener":
      return "/listener";
    case "admin":
      return "/admin";
    default:
      return "/discover";
  }
}
