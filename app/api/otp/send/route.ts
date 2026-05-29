import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { sendOtp } from "@/lib/twilio";

const schema = z.object({ phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/, "Enter a phone number in international format, e.g. +447700900123") });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    await sendOtp(parsed.data.phone);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("OTP send error:", e);
    return NextResponse.json({ error: "Could not send the code. Check the number and try again." }, { status: 502 });
  }
}
