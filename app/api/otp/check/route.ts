import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { checkOtp } from "@/lib/twilio";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/),
  code: z.string().trim().regex(/^\d{4,8}$/),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code we sent you." }, { status: 400 });
  }

  const approved = await checkOtp(parsed.data.phone, parsed.data.code);
  if (!approved) {
    return NextResponse.json({ error: "That code wasn't right. Please try again." }, { status: 400 });
  }

  // Server-authoritative: only the service role can flip phone_verified.
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ phone: parsed.data.phone, phone_verified: true })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: "Verified, but we couldn't save it. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
