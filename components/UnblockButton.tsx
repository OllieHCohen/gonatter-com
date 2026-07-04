"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { unblockUser } from "@/app/blocks/actions";
import { Button } from "@/components/ui/Button";

export function UnblockButton({ otherId }: { otherId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function unblock() {
    setBusy(true);
    const res = await unblockUser(otherId);
    if (!res.error) router.refresh();
    setBusy(false);
  }

  return (
    <Button variant="secondary" onClick={unblock} disabled={busy}>
      {busy ? "Unblocking…" : "Unblock"}
    </Button>
  );
}
