// Seed two persistent test accounts (caller + a fully-live listener) against
// the live Supabase project, via the service-role admin client. Idempotent:
// removes any existing accounts with these emails first, then recreates them.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PASSWORD = "gonatter1234";
const CALLER_EMAIL = "test.caller@gonatter.app";
const LISTENER_EMAIL = "test.listener@gonatter.app";

async function deleteByEmail(email) {
  // Page through users to find any with this email, then delete.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) { await admin.auth.admin.deleteUser(hit.id); return true; }
    if (data.users.length < 200) break;
  }
  return false;
}

async function makeUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

console.log("Removing any existing test accounts…");
console.log("  caller removed:", await deleteByEmail(CALLER_EMAIL));
console.log("  listener removed:", await deleteByEmail(LISTENER_EMAIL));

// ── Caller ──
const callerId = await makeUser(CALLER_EMAIL);
await admin.from("profiles").insert({
  id: callerId, role: "caller", display_name: "Test Caller", country: "gb", phone_verified: true,
});
await admin.from("caller_profiles").insert({ profile_id: callerId, seen_platonic_reminder: false });
console.log("\n✓ Caller created:", callerId);

// ── Listener (fully live: verified, charges enabled, available) ──
const listenerId = await makeUser(LISTENER_EMAIL);
await admin.from("profiles").insert({
  id: listenerId, role: "listener", display_name: "Sam (Test Listener)", country: "gb", phone_verified: true,
});
await admin.from("listener_profiles").insert({
  profile_id: listenerId,
  bio: "Friendly test listener — here for a calm, no-pressure chat about your day.",
  per_minute_rate_minor: 50, rate_currency: "gbp",
  id_verified: true, charges_enabled: true, available: true,
});
console.log("✓ Listener created (live in discovery):", listenerId);

console.log(`\n──────────── TEST ACCOUNTS ────────────`);
console.log(`Caller    →  ${CALLER_EMAIL}   /  ${PASSWORD}`);
console.log(`Listener  →  ${LISTENER_EMAIL} /  ${PASSWORD}`);
console.log(`───────────────────────────────────────`);
console.log("Note: listener has no Stripe Connect account, so a real payout");
console.log("transfer at call settlement will fail — discovery/chat/call-setup work.");
process.exit(0);
