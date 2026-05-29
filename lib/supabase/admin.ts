import { createClient } from "@supabase/supabase-js";

// Service-role client — BYPASSES RLS. Server-only. NEVER import into a client
// component or it will leak the key into the browser bundle.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
