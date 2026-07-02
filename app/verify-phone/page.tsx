import { redirect } from "next/navigation";
import { getSessionProfile, phoneVerificationRequired } from "@/lib/auth";
import { VerifyPhoneForm } from "./VerifyPhoneForm";

export default async function VerifyPhonePage() {
  // Deliberately NOT requireUser(): its phone gate redirects unverified users
  // to this very page, which would loop.
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  return <VerifyPhoneForm required={phoneVerificationRequired()} />;
}
