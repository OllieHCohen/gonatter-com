"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { sendMessage, setConversationState } from "@/app/messages/actions";
import { blockUser, unblockUser } from "@/app/blocks/actions";
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
  initialBlockedByMe: boolean;
  initialBlockedMe: boolean;
};

export function Thread({
  conversationId,
  userId,
  role,
  otherName,
  otherId,
  initialState,
  initialMessages,
  initialBlockedByMe,
  initialBlockedMe,
}: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [state, setState] = useState<ConversationState>(initialState);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(initialBlockedByMe);
  const [blockBusy, setBlockBusy] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  // Newest-first layout: the composer sits at the top and new messages appear
  // directly beneath it — no auto-scrolling anywhere, ever.

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Server is the source of truth: re-fetch the full ordered thread + state.
    // This both powers the polling fallback and reconciles optimistic sends.
    async function fetchLatest() {
      const [{ data: msgs }, { data: conv }] = await Promise.all([
        supabase
          .from("messages")
          .select("id, sender_id, body, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
        supabase.from("conversations").select("state").eq("id", conversationId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (msgs) {
        // Keep the previous array identity when nothing changed — avoids
        // pointless re-renders on every poll tick.
        setMessages((prev) => {
          const next = msgs as ThreadMessage[];
          if (prev.length === next.length && prev.at(-1)?.id === next.at(-1)?.id) return prev;
          return next;
        });
      }
      if (conv?.state) setState(conv.state as ConversationState);
    }

    const channel = supabase.channel(`conv:${conversationId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => void fetchLatest(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${conversationId}` },
        (payload) => setState((payload.new as { state: ConversationState }).state),
      )
      .on("presence", { event: "sync" }, () => {
        const present = channel.presenceState();
        setOnline(Object.prototype.hasOwnProperty.call(present, otherId));
      });

    // Attach the user's JWT to the realtime socket, otherwise RLS drops every
    // change for protected tables, then subscribe + announce our presence.
    (async () => {
      const { data } = await supabase.auth.getSession();
      supabase.realtime.setAuth(data.session?.access_token ?? null);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ online: true });
      });
    })();

    // Polling fallback — guarantees fresh messages even if the websocket fails.
    const poll = setInterval(fetchLatest, 3500);

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, otherId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    setDraft("");
    // Optimistic: show it immediately; fetchLatest reconciles to server truth.
    const temp: ThreadMessage = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);
    const res = await sendMessage(conversationId, body);
    if (res?.error) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setDraft(body);
      setSendError(res.error);
    }
    setSending(false);
  }

  async function decide(next: "accepted" | "declined") {
    setState(next);
    await setConversationState(conversationId, next);
  }

  // Two-step confirm rendered inline — no native dialogs.
  async function toggleBlock() {
    if (blockBusy) return;
    if (!blockedByMe && !confirmingBlock) {
      setConfirmingBlock(true);
      return;
    }
    setBlockBusy(true);
    const res = blockedByMe ? await unblockUser(otherId) : await blockUser(otherId);
    if (!res.error) {
      setBlockedByMe(!blockedByMe);
      setSendError(null);
    }
    setConfirmingBlock(false);
    setBlockBusy(false);
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <Link href="/messages" className="text-sm text-muted hover:text-navy">
            ← Messages
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal font-display text-lg font-bold text-white"
            >
              {otherName.charAt(0).toUpperCase()}
            </span>
            <h1 className="font-display text-xl font-bold text-navy">{otherName}</h1>
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                online ? "bg-success" : "bg-line",
              )}
              aria-hidden
            />
            <span className={online ? "text-success" : "text-muted"}>
              {online ? "Online now" : "Offline"}
            </span>
          </p>
          <span className="flex gap-3">
            <Link
              href={`/report?subject=${otherId}`}
              className="text-xs font-semibold text-muted hover:text-error"
            >
              Report
            </Link>
            <button
              type="button"
              onClick={toggleBlock}
              disabled={blockBusy}
              className="text-xs font-semibold text-muted hover:text-error"
            >
              {blockedByMe ? "Unblock" : "Block"}
            </button>
          </span>
        </div>
        {state === "accepted" && !blockedByMe && !initialBlockedMe && (
          <ButtonLink href={`/call/${conversationId}`}>
            {role === "caller" ? "Start call" : "Join call"}
          </ButtonLink>
        )}
      </div>

      {confirmingBlock && !blockedByMe && (
        <div className="mt-3 rounded-xl bg-error/10 px-4 py-3 text-center text-sm">
          <p className="font-semibold text-navy">
            {`Block ${otherName}? They won't be able to message or call you, and you won't be able to contact them.`}
          </p>
          <div className="mt-2 flex justify-center gap-3">
            <Button variant="danger" onClick={toggleBlock} disabled={blockBusy}>
              {blockBusy ? "Blocking…" : `Yes, block ${otherName}`}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmingBlock(false)} disabled={blockBusy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {blockedByMe && (
        <p className="mt-3 rounded-xl bg-error/10 px-4 py-3 text-center text-sm font-semibold text-navy">
          {`You've blocked ${otherName}. They can't message or call you. `}
          <button type="button" onClick={toggleBlock} disabled={blockBusy} className="text-teal underline">
            Unblock
          </button>
        </p>
      )}

      {!blockedByMe && initialBlockedMe && (
        <p className="mt-3 rounded-xl bg-line/30 px-4 py-3 text-center text-sm text-muted">
          You can&apos;t contact this person.
        </p>
      )}

      {state === "declined" && (
        <p className="mt-3 rounded-xl bg-line/30 px-4 py-3 text-center text-sm text-muted">
          This conversation was declined.
        </p>
      )}

      {state === "open" && role === "listener" && (
        <div className="mt-3 flex gap-3">
          <Button onClick={() => decide("accepted")} className="flex-1">
            Accept
          </Button>
          <Button onClick={() => decide("declined")} variant="secondary" className="flex-1">
            Decline
          </Button>
        </div>
      )}

      {state === "accepted" && role === "listener" && (
        <p className="mt-3 rounded-xl bg-mint px-4 py-3 text-center text-sm text-navy">
          You accepted. Tap “Join call” when {otherName} starts — or to be ready and waiting.
        </p>
      )}

      {state !== "declined" && !blockedByMe && !initialBlockedMe && (
        <div className="mt-3 border-b border-line pb-4">
          <form onSubmit={send} className="flex gap-2">
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
          {sendError && (
            <p className="mt-2 text-center text-sm font-semibold text-error">{sendError}</p>
          )}
        </div>
      )}

      {/* Newest first — your just-sent message appears right under the box. */}
      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {[...messages].reverse().map((m) => {
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
      </div>
    </div>
  );
}
