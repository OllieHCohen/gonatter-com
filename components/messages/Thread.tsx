"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { sendMessage, setConversationState } from "@/app/messages/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { ConversationState } from "@/lib/types";

export type ThreadMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type Props = {
  conversationId: string;
  userId: string;
  role: "caller" | "listener";
  otherName: string;
  otherId: string;
  initialState: ConversationState;
  initialMessages: ThreadMessage[];
};

export function Thread({ conversationId, userId, role, otherName, otherId, initialState, initialMessages }: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [state, setState] = useState<ConversationState>(initialState);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as ThreadMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${conversationId}` },
        (payload) => setState((payload.new as { state: ConversationState }).state),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    const res = await sendMessage(conversationId, body);
    if (res?.error) setDraft(body);
    setSending(false);
  }

  async function decide(next: "accepted" | "declined") {
    setState(next);
    await setConversationState(conversationId, next);
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <Link href="/messages" className="text-sm text-muted hover:text-navy">
            ← Messages
          </Link>
          <h1 className="font-display text-xl font-bold text-navy">{otherName}</h1>
          <Link
            href={`/report?subject=${otherId}`}
            className="text-xs font-semibold text-muted hover:text-error"
          >
            Report
          </Link>
        </div>
        {state === "accepted" && (
          <ButtonLink href={`/call/${conversationId}`}>
            {role === "caller" ? "Start call" : "Join call"}
          </ButtonLink>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-base",
                  mine ? "bg-teal text-white" : "bg-white text-navy border border-line",
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {state === "declined" && (
        <p className="rounded-xl bg-line/30 px-4 py-3 text-center text-sm text-muted">
          This conversation was declined.
        </p>
      )}

      {state === "open" && role === "listener" && (
        <div className="flex gap-3 border-t border-line pt-3">
          <Button onClick={() => decide("accepted")} className="flex-1">
            Accept
          </Button>
          <Button onClick={() => decide("declined")} variant="secondary" className="flex-1">
            Decline
          </Button>
        </div>
      )}

      {state === "accepted" && role === "listener" && (
        <p className="rounded-xl bg-mint px-4 py-3 text-center text-sm text-navy">
          You accepted. Tap “Join call” when {otherName} starts — or to be ready and waiting.
        </p>
      )}

      {state !== "declined" && (
        <form onSubmit={send} className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            className="flex-1 rounded-full border border-line bg-white px-4 py-3 text-base text-navy placeholder:text-muted/70 focus:border-teal"
          />
          <Button type="submit" disabled={sending || !draft.trim()}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
}
