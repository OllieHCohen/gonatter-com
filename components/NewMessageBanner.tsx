"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Note = { conversationId: string; senderName: string };

// Site-wide banner on logged-in pages: "X sent you a message" the moment a
// message lands (realtime insert, with a poll fallback). Suppressed while
// you're already reading that conversation.
export function NewMessageBanner({ userId }: { userId: string }) {
  const pathname = usePathname();
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const sinceRef = { current: new Date().toISOString() };

    async function handleNew(row: { conversation_id: string; sender_id: string; created_at: string }) {
      if (row.sender_id === userId) return;
      if (row.created_at > sinceRef.current) sinceRef.current = row.created_at;
      // Already reading this thread — it updates live there, no banner needed.
      if (window.location.pathname === `/messages/${row.conversation_id}`) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", row.sender_id)
        .maybeSingle();
      if (cancelled) return;
      setNote({
        conversationId: row.conversation_id,
        senderName: data?.display_name ?? "Someone",
      });
    }

    const channel = supabase.channel(`new-messages:${userId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => void handleNew(payload.new as { conversation_id: string; sender_id: string; created_at: string }),
    );

    (async () => {
      const { data } = await supabase.auth.getSession();
      supabase.realtime.setAuth(data.session?.access_token ?? null);
      channel.subscribe();
    })();

    // Poll fallback so the banner still works if the websocket drops.
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("messages")
        .select("conversation_id, sender_id, created_at")
        .gt("created_at", sinceRef.current)
        .neq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]) void handleNew(data[0]);
    }, 15_000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!note) return null;

  // Navigating into the conversation clears the banner (render-time guard —
  // no setState-in-effect cascade).
  if (pathname === `/messages/${note.conversationId}`) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-navy bg-navy px-4 py-3 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <p className="font-semibold">💬 {note.senderName} just sent you a message</p>
        <span className="flex items-center gap-3">
          <Link
            href={`/messages/${note.conversationId}`}
            className="rounded-full bg-white px-5 py-2 text-sm font-bold text-navy"
          >
            Read it
          </Link>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setNote(null)}
            className="text-xl leading-none text-white/80 hover:text-white"
          >
            ×
          </button>
        </span>
      </div>
    </div>
  );
}
