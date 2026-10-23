"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// Cloudflare Turnstile widget. Puts the token in a hidden `cf-turnstile-response`
// input inside the surrounding form. Bump `resetKey` (e.g. after a failed
// submit) to get a fresh token, since each one can only be verified once.
// Renders nothing until the site key is configured.
export function Turnstile({ siteKey, resetKey }: { siteKey?: string; resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!window.turnstile);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey || !ready || !box.current || !window.turnstile) return;
    widgetId.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [ready, siteKey]);

  useEffect(() => {
    if (widgetId.current && resetKey !== undefined) {
      window.turnstile?.reset(widgetId.current);
      setToken("");
    }
  }, [resetKey]);

  if (!siteKey) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={box} className="flex justify-center" />
      <input type="hidden" name="cf-turnstile-response" value={token} />
    </>
  );
}
