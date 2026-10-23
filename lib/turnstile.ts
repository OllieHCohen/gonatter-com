// Cloudflare Turnstile (CAPTCHA) server-side verification. Server-only.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// The site key is public by design; it's read on the server and passed to the
// widget as a prop, so it doesn't need a NEXT_PUBLIC_ name.
export function turnstileSiteKey(): string | undefined {
  return process.env.NEXT_TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;
}

export function turnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY && !!turnstileSiteKey();
}

// True when the token is valid. When Turnstile isn't configured yet this
// returns true, so signup keeps working until the keys are added.
export async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  if (!token) return false;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY!,
        response: token,
        ...(ip !== "unknown" ? { remoteip: ip } : {}),
      }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error("Turnstile verify failed:", (e as Error).message);
    return false;
  }
}
