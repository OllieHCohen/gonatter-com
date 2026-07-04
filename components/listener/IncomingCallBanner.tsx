"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type IncomingCall = { conversationId: string; callerName: string };

// Site-wide banner for listeners: pops the moment a caller starts a call
// (realtime insert on call_sessions), with a poll fallback so it still works
// if the websocket is down. Dismiss hides it until the next call.
export function IncomingCallBanner({ userId }: { userId: string }) {
  const [call, setCall] = useState<IncomingCall | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function checkActive() {
      const { data } = await supabase
        .from("call_sessions")
        .select("conversation_id, state, listener_connected, created_at")
        .eq("listener_id", userId)
        .in("state", ["authorising", "active"])
        .eq("listener_connected", false)
        .gte("created_at", new Date(Date.now() - 30 * 60_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setCall(null);
        return;
      }
      const { data: conv } = await supabase
        .from("conversations")
        .select("caller:profiles!conversations_caller_id_fkey(display_name)")
        .eq("id", data.conversation_id)
        .maybeSingle();
      if (cancelled) return;
      const callerName =
        (conv as unknown as { caller: { display_name: string } | null } | null)?.caller
          ?.display_name ?? "A caller";
      setCall({ conversationId: data.conversation_id, callerName });
    }

    const channel = supabase.channel(`incoming-calls:${userId}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "call_sessions", filter: `listener_id=eq.${userId}` },
      () => void checkActive(),
    );

    (async () => {
      const { data } = await supabase.auth.getSession();
      supabase.realtime.setAuth(data.session?.access_token ?? null);
      channel.subscribe();
      await checkActive();
    })();

    const poll = setInterval(checkActive, 12_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!call || dismissed === call.conversationId) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-teal bg-teal px-4 py-3 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <p className="font-semibold">
          📞 {call.callerName} is calling you now
        </p>
        <span className="flex items-center gap-3">
          <Link
            href={`/call/${call.conversationId}`}
            className="rounded-full bg-white px-5 py-2 text-sm font-bold text-teal"
          >
            Join call
          </Link>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed(call.conversationId)}
            className="text-xl leading-none text-white/80 hover:text-white"
          >
            ×
          </button>
        </span>
      </div>
    </div>
  );
}
