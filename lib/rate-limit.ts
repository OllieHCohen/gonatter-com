// Fixed-window rate limiting backed by Postgres (see migration 0014). Server-only.
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export type Limit = { key: string; max: number; windowSeconds: number };

// Records one hit against every limit and returns false if any is exceeded.
// Fails open on a database error so an outage never locks real people out.
export async function rateLimit(...limits: Limit[]): Promise<boolean> {
  const admin = createAdminClient();
  const results = await Promise.all(
    limits.map(async ({ key, max, windowSeconds }) => {
      const { data, error } = await admin.rpc("hit_rate_limit", {
        p_key: key,
        p_window_seconds: windowSeconds,
        p_max: max,
      });
      if (error) {
        console.error("rateLimit failed:", key, error.message);
        return true;
      }
      return data === true;
    }),
  );
  return results.every(Boolean);
}

// Caller's IP. On Vercel the first x-forwarded-for entry is set by the edge.
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export const HOUR = 60 * 60;
export const DAY = 24 * HOUR;
