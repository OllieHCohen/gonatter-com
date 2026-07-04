"use client";

import { useState } from "react";
import { submitReview } from "@/app/reviews/actions";
import { Button } from "@/components/ui/Button";
import { Textarea, FieldError } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export function ReviewForm({ callSessionId, otherName }: { callSessionId: string; otherName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="text-center text-sm font-semibold text-success">Thanks for your feedback.</p>;
  }

  async function submit() {
    if (rating < 1) {
      setError("Please pick a rating.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await submitReview(callSessionId, rating, body);
    setBusy(false);
    if (res.error) setError(res.error);
    else setDone(true);
  }

  return (
    <div className="space-y-3 border-t border-line pt-4 text-left">
      <p className="text-center text-sm font-semibold text-navy">How was your chat with {otherName}?</p>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={cn(
              "text-3xl leading-none transition-colors",
              (hover || rating) >= n ? "text-sunshine" : "text-line",
            )}
          >
            ★
          </button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        placeholder="Add a note (optional)"
        className="min-h-20"
      />
      {error && <FieldError>{error}</FieldError>}
      <Button onClick={submit} disabled={busy} className="w-full">
        {busy ? "Saving…" : "Submit review"}
      </Button>
    </div>
  );
}
