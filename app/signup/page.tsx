import { connection } from "next/server";
import { turnstileSiteKey } from "@/lib/turnstile";
import { SignupPage } from "./SignupForm";

export default async function Page() {
  // Read the CAPTCHA site key at request time so it comes from the server env.
  await connection();
  return <SignupPage turnstileSiteKey={turnstileSiteKey()} />;
}
