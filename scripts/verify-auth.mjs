// Throwaway: prove admin-signup + RLS read work against the live project.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const email = `verify_${Date.now()}@example.com`;
const password = "password1234";

const { data: c, error: ce } = await admin.auth.admin.createUser({
  email, password, email_confirm: true, user_metadata: { display_name: "Verify Bot", role: "caller" },
});
if (ce) throw ce;
const uid = c.user.id;
console.log("created user", uid);

const { error: pe } = await admin.from("profiles").insert({ id: uid, role: "caller", display_name: "Verify Bot", country: "gb" });
if (pe) throw pe;
await admin.from("caller_profiles").insert({ profile_id: uid });
console.log("profile inserted");

// Sign in as the user (anon) and read own profile via RLS.
const { data: s, error: se } = await anon.auth.signInWithPassword({ email, password });
if (se) throw se;
const userClient = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${s.session.access_token}` } },
});
const { data: own } = await userClient.from("profiles").select("display_name,role").eq("id", uid).single();
console.log("RLS own read:", own);

// Negative: this user must NOT update phone_verified (column grant blocks it).
const { error: badUpdate } = await userClient.from("profiles").update({ phone_verified: true }).eq("id", uid);
console.log("phone_verified update blocked:", badUpdate ? `YES (${badUpdate.code})` : "NO — SECURITY HOLE");

// Negative: cannot read call_sessions of others (none exist; expect empty, no error).
const { data: cs } = await userClient.from("call_sessions").select("id");
console.log("call_sessions visible to caller:", cs?.length ?? 0);

await admin.auth.admin.deleteUser(uid);
console.log("cleaned up");
