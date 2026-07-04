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

// Phone verification is only enforced when Twilio can actually deliver OTPs
// (trial accounts can't reach unverified numbers). Flip the env var to "true"
// in Vercel once Twilio is upgraded.
export function phoneVerificationRequired(): boolean {
  return process.env.PHONE_VERIFICATION_REQUIRED === "true";
}

// Guard: require a signed-in user; redirect to login otherwise.
// Also enforces the phone gate — /post-auth's redirect alone is bypassable
// by navigating straight to an app URL.
export async function requireUser() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile && !session.profile.phone_verified && phoneVerificationRequired()) {
    redirect("/verify-phone");
  }
  return session;
}

// Is this profile an admin? Grantable flag, with the legacy role as fallback.
export function isAdmin(profile: Profile | null): boolean {
  return !!profile && (profile.is_admin || profile.role === "admin");
}

// Guard: require an admin (any role with the is_admin flag, or the admin role).
export async function requireAdmin() {
  const session = await requireUser();
  if (!session.profile) redirect("/signup");
  if (!isAdmin(session.profile)) redirect(homePathForRole(session.profile.role));
  return session as { userId: string; email: string | null; profile: Profile };
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
