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
  const [canPlayAudio, setCanPlayAudio] = useState(true);
  const [levels, setLevels] = useState<{ me: number; other: number }>({ me: 0, other: 0 });
  const [diag, setDiag] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<{
    charged: boolean;
    finalAmountMinor: number;
    chargeSeconds: number;
    currency: string;
    startedAt?: string | null;
    endedAt?: string | null;
    settleError?: string;
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
        startedAt: res.startedAt,
        endedAt: res.endedAt,
        settleError: res.error,
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

    // Live speaking levels for both sides — the visual proof that audio is
    // actually flowing in each direction.
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      let me = 0;
      let other = 0;
      for (const p of speakers) {
        if (p.identity === room.localParticipant.identity) me = p.audioLevel;
        else other = p.audioLevel;
      }
      setLevels({ me, other });
    });

    // Browsers can silently refuse to play incoming audio until the user
    // interacts (autoplay policy) — the classic "they hear me, I can't hear
    // them". Surface it instead of suffering it.
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      setCanPlayAudio(room.canPlaybackAudio);
    });

    // Diagnostics snapshot every couple of seconds while in the call.
    const diagTimer = setInterval(() => {
      const lp = room.localParticipant;
      const micPub = lp.getTrackPublications().find((p) => p.kind === "audio");
      const remote = Array.from(room.remoteParticipants.values())[0];
      const remotePub = remote?.getTrackPublications().find((p) => p.kind === "audio");
      setDiag({
        "connection": room.state,
        "your microphone": micPub ? (micPub.isMuted ? "muted" : "publishing") : "NOT publishing",
        "other participant": remote ? "connected" : "not connected",
        "incoming audio": remotePub
          ? remotePub.isSubscribed
            ? remotePub.isMuted
              ? "subscribed (they're muted)"
              : "subscribed"
            : "NOT subscribed"
          : "no track yet",
        "sound playback": room.canPlaybackAudio ? "allowed" : "BLOCKED by browser — tap Enable sound",
      });
    }, 2000);

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
      setCanPlayAudio(room.canPlaybackAudio);
      setStatus((s) => (s === "active" ? s : "waiting"));
      await refreshConnection();
    })();

    return () => {
      cancelled = true;
      clearInterval(diagTimer);
      void room.disconnect();
    };
  }, [callSessionId, role, refreshConnection, finish]);

  // Unblock incoming audio after a browser autoplay refusal.
  async function enableSound() {
    try {
      await roomRef.current?.startAudio();
      setCanPlayAudio(roomRef.current?.canPlaybackAudio ?? true);
    } catch {
      /* the button stays visible for another try */
    }
  }

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
    const startedLabel = summary.startedAt
      ? new Date(summary.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : null;
    return (
      <Card className="space-y-4 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">Call ended</h1>
        <p className="text-muted">{SAFETY_END}</p>

        {summary.chargeSeconds > 0 && (
          <p className="text-sm text-muted">
            {startedLabel && <>Started {startedLabel} · </>}Call length {mmss(summary.chargeSeconds)}
          </p>
        )}

        <div className={`rounded-xl px-4 py-4 ${summary.settleError ? "bg-error/10" : "bg-mint"}`}>
          {summary.settleError ? (
            <p className="text-base font-semibold text-navy">
              We hit a problem finalising this call, so nothing extra has been taken — the team has
              been notified and will put any charge right. Sorry about that.
            </p>
          ) : summary.charged ? (
            role === "caller" ? (
              <p className="text-lg font-bold text-navy">
                You were charged {formatMoney(summary.finalAmountMinor, summary.currency)} for{" "}
                {mmss(summary.chargeSeconds)}
              </p>
            ) : (
              <p className="text-lg font-bold text-navy">
                You earned {formatMoney(listenerShare, summary.currency)} for {mmss(summary.chargeSeconds)}
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

      {!canPlayAudio && (
        <button
          type="button"
          onClick={enableSound}
          className="w-full rounded-2xl border-2 border-warning bg-warning/10 px-4 py-4 font-semibold text-navy"
        >
          🔊 Your browser is blocking incoming sound — tap here to enable it
        </button>
      )}

      <div className="mx-auto w-full max-w-sm space-y-2">
        <AudioLevelBar label={muted ? "You (muted)" : "You"} level={muted ? 0 : levels.me} />
        <AudioLevelBar label={otherName} level={levels.other} />
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={toggleMute}>
          {muted ? "Unmute" : "Mute"}
        </Button>
        <Button variant="danger" onClick={() => finish(role === "caller" ? "caller_left" : "listener_left")}>
          End call
        </Button>
      </div>

      <details className="text-left">
        <summary className="cursor-pointer text-center text-xs font-semibold text-muted hover:text-navy">
          Call diagnostics
        </summary>
        <dl className="mx-auto mt-2 max-w-sm space-y-1 rounded-xl bg-mint/40 p-3 text-xs text-navy">
          {Object.entries(diag).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="font-semibold">{k}</dt>
              <dd className={/NOT|BLOCKED/.test(v) ? "font-semibold text-error" : ""}>{v}</dd>
            </div>
          ))}
        </dl>
      </details>
    </Card>
  );
}

// A speaking meter: fills and turns green while that side's voice is coming
// through, so both people can SEE the audio flowing.
function AudioLevelBar({ label, level }: { label: string; level: number }) {
  const speaking = level > 0.02;
  const width = Math.min(100, Math.round(level * 300));
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-right text-xs font-semibold text-navy">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line/50">
        <div
          className={`h-full rounded-full transition-all duration-150 ${speaking ? "bg-success" : "bg-line"}`}
          style={{ width: `${speaking ? Math.max(width, 12) : 4}%` }}
        />
      </div>
      <span className={`w-16 shrink-0 text-xs ${speaking ? "font-semibold text-success" : "text-muted"}`}>
        {speaking ? "speaking" : "quiet"}
      </span>
    </div>
  );
}
