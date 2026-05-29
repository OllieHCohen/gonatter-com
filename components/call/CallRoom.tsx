"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { getCallToken, markConnected, endCall } from "@/app/call/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ReviewForm } from "@/components/ReviewForm";
import { formatMoney } from "@/lib/money";
import { SAFETY_END } from "@/lib/copy";
import { REVIEW_UNLOCK_SECONDS } from "@/lib/billing";

type Props = {
  callSessionId: string;
  conversationId: string;
  role: "caller" | "listener";
  otherName: string;
  otherId: string;
};

type Status = "connecting" | "waiting" | "active" | "ended" | "error";

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CallRoom({ callSessionId, conversationId, role, otherName, otherId }: Props) {
  const [status, setStatus] = useState<Status>("connecting");
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [summary, setSummary] = useState<{
    charged: boolean;
    finalAmountMinor: number;
    chargeSeconds: number;
    currency: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const blockSecondsRef = useRef<number>(60 * 60);
  const currencyRef = useRef<string>("gbp");
  const endingRef = useRef(false);

  const finish = useCallback(
    async (reason: "caller_left" | "listener_left" | "block_reached") => {
      if (endingRef.current) return;
      endingRef.current = true;
      setStatus("ended");
      try {
        await roomRef.current?.disconnect();
      } catch {
        /* ignore */
      }
      const res = await endCall(callSessionId, reason);
      setSummary({
        charged: res.charged,
        finalAmountMinor: res.finalAmountMinor,
        chargeSeconds: res.chargeSeconds,
        currency: currencyRef.current,
      });
    },
    [callSessionId],
  );

  // Server-authoritative connection check; stamps billing start when both present.
  const refreshConnection = useCallback(async () => {
    const { active, bothConnectedAt } = await markConnected(callSessionId);
    if (active && bothConnectedAt) {
      startedAtRef.current = new Date(bothConnectedAt).getTime();
      setStatus((s) => (s === "ended" || s === "error" ? s : "active"));
    }
  }, [callSessionId]);

  useEffect(() => {
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio && audioRef.current) {
        const el = track.attach();
        audioRef.current.appendChild(el);
      }
    });
    room.on(RoomEvent.ParticipantConnected, () => void refreshConnection());
    room.on(RoomEvent.ParticipantDisconnected, () => {
      // The other side left — settle now.
      void finish(role === "caller" ? "listener_left" : "caller_left");
    });

    (async () => {
      const t = await getCallToken(callSessionId);
      if (cancelled) return;
      if (t.error || !t.token || !t.wsUrl) {
        setStatus("error");
        setErrorMsg(t.error ?? "Couldn't join the call.");
        return;
      }
      blockSecondsRef.current = (t.blockMinutes ?? 60) * 60;
      currencyRef.current = t.currency ?? "gbp";
      try {
        await room.connect(t.wsUrl, t.token);
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        setStatus("error");
        setErrorMsg("We couldn't access your microphone. Check permissions and try again.");
        return;
      }
      setStatus((s) => (s === "active" ? s : "waiting"));
      await refreshConnection();
    })();

    return () => {
      cancelled = true;
      void room.disconnect();
    };
  }, [callSessionId, role, refreshConnection, finish]);

  // Ticking timer + block-cap long-stop (the hard cap on spend).
  useEffect(() => {
    if (status !== "active") return;
    const id = setInterval(() => {
      if (startedAtRef.current == null) return;
      const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(secs);
      if (secs >= blockSecondsRef.current) void finish("block_reached");
    }, 1000);
    return () => clearInterval(id);
  }, [status, finish]);

  function toggleMute() {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    const next = !muted;
    setMuted(next);
    void lp.setMicrophoneEnabled(!next);
  }

  if (status === "ended" && summary) {
    const listenerShare = Math.round(summary.finalAmountMinor * 0.75);
    return (
      <Card className="space-y-4 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">Call ended</h1>
        <p className="text-muted">{SAFETY_END}</p>
        <div className="rounded-xl bg-mint px-4 py-4">
          {summary.charged ? (
            role === "caller" ? (
              <p className="text-lg font-bold text-navy">
                You were charged {formatMoney(summary.finalAmountMinor, summary.currency)}
              </p>
            ) : (
              <p className="text-lg font-bold text-navy">
                You earned {formatMoney(listenerShare, summary.currency)}
              </p>
            )
          ) : (
            <p className="text-lg font-bold text-navy">No charge — the call was under 30 seconds.</p>
          )}
        </div>
        {role === "caller" && summary.chargeSeconds >= REVIEW_UNLOCK_SECONDS && (
          <ReviewForm callSessionId={callSessionId} listenerName={otherName} />
        )}

        <div className="flex flex-col items-center gap-2 pt-2">
          <Link
            href={`/messages/${conversationId}`}
            className="inline-block rounded-full bg-teal px-6 py-3 font-semibold text-white hover:bg-teal-600"
          >
            Back to messages
          </Link>
          <Link
            href={`/report?subject=${otherId}&call=${callSessionId}`}
            className="text-sm font-semibold text-muted hover:text-error"
          >
            Report a problem
          </Link>
        </div>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="space-y-4 text-center">
        <h1 className="font-display text-xl font-bold text-navy">Couldn&apos;t connect</h1>
        <p className="text-muted">{errorMsg}</p>
        <Link href={`/messages/${conversationId}`} className="text-sm font-semibold text-teal hover:underline">
          Back to messages
        </Link>
      </Card>
    );
  }

  return (
    <Card className="space-y-6 text-center">
      <div ref={audioRef} className="sr-only" />
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">{otherName}</h1>
        <p className="mt-1 text-muted">
          {status === "connecting" && "Connecting…"}
          {status === "waiting" && `Waiting for ${otherName} to join…`}
          {status === "active" && "Connected"}
        </p>
      </div>

      <div className="font-display text-5xl font-bold tabular-nums text-navy">{mmss(elapsed)}</div>

      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={toggleMute}>
          {muted ? "Unmute" : "Mute"}
        </Button>
        <Button variant="danger" onClick={() => finish(role === "caller" ? "caller_left" : "listener_left")}>
          End call
        </Button>
      </div>
    </Card>
  );
}
