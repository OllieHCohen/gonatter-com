// Throwaway acceptance check (§14): exercises pre-chat + RLS against the live
// project using anon (user-scoped) clients, then cleans up. No browser/audio.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "✓" : "✗ FAIL"} ${name}${extra ? " — " + extra : ""}`); };

async function makeUser(role, name) {
  const email = `e2e_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;
  const password = "password1234";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  await admin.from("profiles").insert({ id, role, display_name: name, country: "gb" });
  if (role === "caller") await admin.from("caller_profiles").insert({ profile_id: id });
  if (role === "listener") {
    await admin.from("listener_profiles").insert({
      profile_id: id, bio: `${name} bio`, per_minute_rate_minor: 50, rate_currency: "gbp",
      id_verified: true, charges_enabled: true, available: true,
    });
  }
  const { data: s } = await createClient(url, anonKey, { auth: { persistSession: false } })
    .auth.signInWithPassword({ email, password });
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${s.session.access_token}` } },
  });
  return { id, client };
}

const caller = await makeUser("caller", "Caller One");
const listener = await makeUser("listener", "Listener One");
const bystander = await makeUser("caller", "Bystander");

try {
  // Discovery: caller sees the live listener.
  const { data: live } = await caller.client.from("listener_profiles")
    .select("profile_id, profiles!inner(display_name)")
    .eq("id_verified", true).eq("charges_enabled", true).eq("available", true)
    .eq("profile_id", listener.id);
  ok("caller sees live listener in discovery", (live?.length ?? 0) === 1);

  // Pre-chat: caller opens a conversation + opener message.
  const { data: conv, error: ce } = await caller.client.from("conversations")
    .insert({ caller_id: caller.id, listener_id: listener.id }).select("id").single();
  ok("caller can create conversation", !ce && !!conv, ce?.message);
  const convId = conv.id;
  const { error: me } = await caller.client.from("messages")
    .insert({ conversation_id: convId, sender_id: caller.id, body: "Are you free to talk?" });
  ok("caller can post a message", !me, me?.message);

  // Cross-party read (migration 0009): listener can read the caller's profile.
  const { data: callerProfile } = await listener.client.from("profiles")
    .select("display_name").eq("id", caller.id).maybeSingle();
  ok("listener can read caller name via shared conversation", callerProfile?.display_name === "Caller One");

  // Listener sees the conversation + message.
  const { data: lconv } = await listener.client.from("conversations").select("id").eq("id", convId).maybeSingle();
  ok("listener can read the conversation", !!lconv);
  const { data: lmsgs } = await listener.client.from("messages").select("id").eq("conversation_id", convId);
  ok("listener can read messages", (lmsgs?.length ?? 0) === 1);

  // Listener accepts.
  const { error: ae } = await listener.client.from("conversations").update({ state: "accepted" }).eq("id", convId);
  ok("listener can accept conversation", !ae, ae?.message);

  // Bystander (non-participant) is fully walled off.
  const { data: bconv } = await bystander.client.from("conversations").select("id").eq("id", convId);
  ok("bystander cannot see the conversation", (bconv?.length ?? 0) === 0);
  const { data: bmsgs } = await bystander.client.from("messages").select("id").eq("conversation_id", convId);
  ok("bystander cannot see messages", (bmsgs?.length ?? 0) === 0);
  const { data: bprofile } = await bystander.client.from("profiles").select("display_name").eq("id", caller.id);
  ok("bystander cannot read caller profile", (bprofile?.length ?? 0) === 0);

  // Tamper: caller cannot self-verify (column grant) or write call_sessions.
  const { error: tamper } = await caller.client.from("profiles").update({ phone_verified: true }).eq("id", caller.id);
  ok("caller cannot self-set phone_verified", !!tamper, tamper ? tamper.code : "NO ERROR");
  const { error: csTamper } = await caller.client.from("call_sessions").insert({
    conversation_id: convId, caller_id: caller.id, listener_id: listener.id,
    livekit_room: "x", rate_minor: 50, rate_currency: "gbp", block_minutes: 30, authorised_amount_minor: 1500,
  });
  ok("caller cannot insert call_sessions (service-role only)", !!csTamper, csTamper ? csTamper.code : "NO ERROR");
} finally {
  await admin.auth.admin.deleteUser(caller.id);
  await admin.auth.admin.deleteUser(listener.id);
  await admin.auth.admin.deleteUser(bystander.id);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
