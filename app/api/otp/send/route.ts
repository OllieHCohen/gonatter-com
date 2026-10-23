import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { sendOtp } from "@/lib/twilio";
import { smsAllowed } from "@/lib/countries";
import { clientIp, rateLimit, DAY, HOUR } from "@/lib/rate-limit";

const schema = z.object({ phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/, "Enter a phone number in international format, e.g. +447700900123") });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const phone = parsed.data.phone;
  if (!smsAllowed(phone)) {
    return NextResponse.json(
      { error: "Sorry, we can't send codes to numbers in that country yet." },
      { status: 400 },
    );
  }

  // Every text costs money, so cap them per account, per number and per IP.
  const ip = await clientIp();
  const allowed = await rateLimit(
    { key: `otp-send:user:${user.id}`, max: 5, windowSeconds: HOUR },
    { key: `otp-send:user-day:${user.id}`, max: 10, windowSeconds: DAY },
    { key: `otp-send:phone:${phone}`, max: 5, windowSeconds: HOUR },
    { key: `otp-send:phone-day:${phone}`, max: 10, windowSeconds: DAY },
    { key: `otp-send:ip:${ip}`, max: 10, windowSeconds: HOUR },
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many codes requested. Please wait an hour and try again." },
      { status: 429 },
    );
  }

  try {
    await sendOtp(phone);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("OTP send error:", e);
    return NextResponse.json(
      { error: "We couldn't send a code just now — this is usually a problem on our side, not with your number. Please try again in a few minutes." },
      { status: 502 },
    );
  }
}
