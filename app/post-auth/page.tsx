import { redirect } from "next/navigation";
import { requireUser, homePathForRole, phoneVerificationRequired } from "@/lib/auth";

// Routes a freshly-authenticated user to the right place.
export default async function PostAuth() {
  const { profile } = await requireUser();
  if (!profile) redirect("/signup");
  if (!profile.phone_verified && phoneVerificationRequired()) redirect("/verify-phone");
  redirect(homePathForRole(profile.role));
}
