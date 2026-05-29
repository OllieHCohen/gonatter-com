// Next 16: middleware.ts is renamed to proxy.ts and exports `proxy`.
// Refreshes the Supabase auth session cookie on each request.
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, never take the whole site down — the
  // middleware only refreshes the session cookie; pages do their own auth.
  if (!url || !anonKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[proxy] Supabase env vars missing; skipping session refresh.");
    }
    return response;
  }

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // Touch the session so cookies refresh. Do not gate routes here — pages do
    // their own auth checks server-side.
    await supabase.auth.getUser();
  } catch (err) {
    // A session-refresh failure must not 500 every request.
    console.error("[proxy] session refresh failed:", err);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.svg$).*)"],
};
