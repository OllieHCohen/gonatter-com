// Twilio Verify (OTP) + SMS helpers. Server-only.
const BASE = "https://verify.twilio.com/v2";

function basicAuth() {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const tok = process.env.TWILIO_AUTH_TOKEN!;
  return "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64");
}

function verifyServiceSid() {
  const v = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!v) throw new Error("TWILIO_VERIFY_SERVICE_SID not set");
  return v;
}

export async function sendOtp(phoneE164: string): Promise<void> {
  const res = await fetch(`${BASE}/Services/${verifyServiceSid()}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phoneE164, Channel: "sms" }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Twilio Verify start failed: ${res.status} ${t}`);
  }
}

export async function checkOtp(phoneE164: string, code: string): Promise<boolean> {
  const res = await fetch(`${BASE}/Services/${verifyServiceSid()}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phoneE164, Code: code }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { status?: string };
  return data.status === "approved";
}

// Optional transactional SMS (e.g. "someone wants to talk to you").
export async function sendSms(toE164: string, body: string): Promise<void> {
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) return; // SMS notifications are optional; skip if no from-number.
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toE164, From: from, Body: body }),
    },
  );
  if (!res.ok) console.error("Twilio SMS failed:", res.status, await res.text());
}
