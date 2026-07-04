"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { submitBugReport } from "@/app/bug-report/actions";

// Floating "report a bug" bubble, mounted on every page via the root layout.
// Captures the page and as much environment detail as the browser exposes.
export function BugReportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const recentErrors = useRef<string[]>([]);
  const pathHistory = useRef<string[]>([]);
  const recentClicks = useRef<string[]>([]);
  const mountedAt = useRef<number>(Date.now());

  // hh:mm:ss stamps make the breadcrumb trails readable for whoever debugs.
  function stamp() {
    return new Date().toISOString().slice(11, 19);
  }

  // Breadcrumbs: which pages the user visited and what they clicked just
  // before the bug — the "how do I replicate this" trail for admins.
  useEffect(() => {
    pathHistory.current = [...pathHistory.current, `${stamp()} ${pathname}`].slice(-10);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.(
        "button, a, select, [role=button], input[type=checkbox]",
      ) as HTMLElement | null;
      if (!target) return;
      const label = (target.getAttribute("aria-label") || target.textContent || target.tagName)
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 40);
      recentClicks.current = [
        ...recentClicks.current,
        `${stamp()} ${target.tagName.toLowerCase()} "${label}"`,
      ].slice(-10);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Quietly collect any JS errors that happen while browsing, so a report
  // filed after something breaks carries the evidence with it.
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      recentErrors.current = [...recentErrors.current, `${e.message} @ ${e.filename}:${e.lineno}`].slice(-5);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      recentErrors.current = [...recentErrors.current, `unhandled: ${String(e.reason).slice(0, 300)}`].slice(-5);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  function gatherContext(): Record<string, unknown> {
    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string };
      deviceMemory?: number;
    };
    return {
      path: pathname,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${window.screen.width}x${window.screen.height}`,
      pixel_ratio: window.devicePixelRatio,
      online: navigator.onLine,
      connection: nav.connection?.effectiveType ?? "unknown",
      device_memory_gb: nav.deviceMemory ?? "unknown",
      cpu_cores: navigator.hardwareConcurrency ?? "unknown",
      touch_device: "ontouchstart" in window,
      cookies_enabled: navigator.cookieEnabled,
      time_on_page_s: Math.round((Date.now() - mountedAt.current) / 1000),
      reported_at: new Date().toISOString(),
      pages_visited: pathHistory.current,
      recent_clicks: recentClicks.current,
      recent_js_errors: recentErrors.current,
    };
  }

  async function send() {
    setBusy(true);
    setError(undefined);
    const res = await submitBugReport({
      description,
      email,
      pageUrl: window.location.href,
      context: gatherContext(),
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
    setDescription("");
    setTimeout(() => {
      setOpen(false);
      setDone(false);
    }, 2500);
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open && (
        <div className="mb-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white p-4 shadow-xl">
          {done ? (
            <p className="py-4 text-center font-semibold text-navy">
              Thank you — your report is logged. 🐛✅
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="font-semibold text-navy">Spotted a bug?</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What went wrong? What did you expect to happen?"
                className="w-full resize-none rounded-xl border border-line px-3 py-2 text-sm text-navy outline-none focus:border-teal"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (optional, for follow-up)"
                className="w-full rounded-xl border border-line px-3 py-2 text-sm text-navy outline-none focus:border-teal"
              />
              {error && <p className="text-sm text-error">{error}</p>}
              <button
                type="button"
                onClick={send}
                disabled={busy || description.trim().length < 5}
                className="rounded-full bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:bg-teal-600 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send report"}
              </button>
              <p className="text-xs text-muted">
                We attach the page you&apos;re on and basic device info to help us fix it.
              </p>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close bug report" : "Report a bug"}
        aria-expanded={open}
        className="grid h-12 w-12 place-items-center rounded-full bg-navy text-xl text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? "×" : "🐛"}
      </button>
    </div>
  );
}
