"use client";

import { useState, useTransition } from "react";
import { setAvailability } from "@/app/listener/actions";
import { cn } from "@/lib/cn";

export function AvailabilityToggle({ initial }: { initial: boolean }) {
  const [available, setAvailable] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !available;
    setAvailable(next);
    startTransition(async () => {
      await setAvailability(next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={available}
      className={cn(
        "inline-flex items-center gap-3 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60",
        available ? "border-success bg-success/10 text-success" : "border-line bg-white text-muted",
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          available ? "bg-success" : "bg-muted",
        )}
      />
      {available ? "You're live — available for calls" : "Offline — tap to go live"}
    </button>
  );
}
