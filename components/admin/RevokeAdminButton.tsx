"use client";

import { useTransition } from "react";
import { revokeAdminAction } from "@/app/admin/admins/actions";

export function RevokeAdminButton({ profileId, name }: { profileId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Remove admin access for ${name}?`)) {
          startTransition(() => revokeAdminAction(profileId));
        }
      }}
      className="text-sm font-semibold text-muted hover:text-error disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove admin"}
    </button>
  );
}
