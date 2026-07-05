"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUserStatus } from "@/app/admin/users/actions";

type Status = "active" | "suspended" | "banned";

// Suspend / ban / reinstate with an inline two-step confirm (no native dialogs).
export function UserStatusButtons({
  profileId,
  name,
  status,
  isSelf,
}: {
  profileId: string;
  name: string;
  status: Status;
  isSelf: boolean;
}) {
  const [confirming, setConfirming] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (isSelf) return null;

  async function apply(next: Status) {
    setBusy(true);
    setError(null);
    const res = await setUserStatus(profileId, next);
    if (res.error) setError(res.error);
    else router.refresh();
    setConfirming(null);
    setBusy(false);
  }

  const VERB: Record<Status, string> = { active: "Reinstate", suspended: "Suspend", banned: "Ban" };
  const CONSEQUENCE: Record<Status, string> = {
    active: `${name} will be able to sign in and use gonatter again.`,
    suspended: `${name} will be signed out and locked out of gonatter until reinstated.`,
    banned: `${name} will be signed out and locked out of gonatter permanently.`,
  };

  if (confirming) {
    return (
      <div className="mt-3 rounded-xl bg-error/10 px-4 py-3 text-sm">
        <p className="font-semibold text-navy">
          {`${VERB[confirming]} ${name}? ${CONSEQUENCE[confirming]}`}
        </p>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => apply(confirming)}
            disabled={busy}
            className="rounded-full bg-error px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy ? "Working…" : `Yes, ${VERB[confirming].toLowerCase()}`}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            disabled={busy}
            className="rounded-full border border-line bg-white px-4 py-1.5 text-xs font-semibold text-navy"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {status !== "active" && (
        <button
          type="button"
          onClick={() => setConfirming("active")}
          className="text-xs font-semibold text-teal hover:underline"
        >
          Reinstate
        </button>
      )}
      {status === "active" && (
        <button
          type="button"
          onClick={() => setConfirming("suspended")}
          className="text-xs font-semibold text-muted hover:text-error"
        >
          Suspend
        </button>
      )}
      {status !== "banned" && (
        <button
          type="button"
          onClick={() => setConfirming("banned")}
          className="text-xs font-semibold text-muted hover:text-error"
        >
          Ban
        </button>
      )}
      {error && <span className="text-xs font-semibold text-error">{error}</span>}
    </div>
  );
}
