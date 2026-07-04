"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isRateValid } from "@/lib/billing";

const MIN_RATE_GBP_PER_HOUR = Number(process.env.MIN_RATE_GBP_PER_HOUR ?? "10");

const profileSchema = z.object({
  bio: z.string().trim().max(800).optional(),
  gender: z.string().trim().max(40).optional(),
  dob: z.string().trim().optional(), // yyyy-mm-dd
  photo_url: z.string().trim().url().optional().or(z.literal("")),
  rate_currency: z.string().trim().length(3).toLowerCase().default("gbp"),
  per_minute_rate_minor: z.coerce.number().int().min(1),
  interests: z.array(z.string()).max(20).default([]),
});

export type ListenerProfileState = { error?: string; ok?: boolean };

export async function saveListenerProfile(
  _prev: ListenerProfileState,
  formData: FormData,
): Promise<ListenerProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = profileSchema.safeParse({
    bio: formData.get("bio") || undefined,
    gender: formData.get("gender") || undefined,
    dob: formData.get("dob") || undefined,
    photo_url: formData.get("photo_url") || "",
    rate_currency: formData.get("rate_currency") || "gbp",
    per_minute_rate_minor: formData.get("per_minute_rate_minor"),
    interests: formData.getAll("interests").map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details" };
  }
  const v = parsed.data;

  if (!isRateValid(v.per_minute_rate_minor, v.rate_currency, MIN_RATE_GBP_PER_HOUR)) {
    return {
      error: `Your rate must be at least the equivalent of £${MIN_RATE_GBP_PER_HOUR}/hour.`,
    };
  }

  const { error: upErr } = await supabase
    .from("listener_profiles")
    .update({
      bio: v.bio ?? null,
      gender: v.gender ?? null,
      dob: v.dob || null,
      photo_url: v.photo_url || null,
      rate_currency: v.rate_currency,
      per_minute_rate_minor: v.per_minute_rate_minor,
    })
    .eq("profile_id", user.id);
  if (upErr) return { error: "Couldn't save your profile. Please try again." };

  // Replace interests.
  await supabase.from("listener_interests").delete().eq("listener_id", user.id);
  if (v.interests.length) {
    await supabase
      .from("listener_interests")
      .insert(v.interests.map((interest_id) => ({ listener_id: user.id, interest_id })));
  }

  revalidatePath("/listener/onboarding");
  revalidatePath("/listener");
  return { ok: true };
}

export async function setAvailability(available: boolean): Promise<{ error?: string } | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Server-side go-live gate: complete profile + verified ID. Payouts are
  // deliberately optional — earnings accrue until the listener cashes out.
  if (available) {
    const { data: lp } = await supabase
      .from("listener_profiles")
      .select("bio, photo_url, dob, id_verified")
      .eq("profile_id", user.id)
      .single();
    if (!lp?.bio || !lp?.photo_url || !lp?.dob) {
      return { error: "Finish your profile (photo, bio, date of birth) before going live." };
    }
    if (!lp.id_verified) {
      return { error: "Verify your identity before going live." };
    }
  }

  await supabase
    .from("listener_profiles")
    .update({ available, available_updated_at: new Date().toISOString() })
    .eq("profile_id", user.id);
  revalidatePath("/listener");
  return undefined;
}
