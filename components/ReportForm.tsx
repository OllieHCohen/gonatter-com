"use client";

import { useActionState } from "react";
import Link from "next/link";
import { fileReport, type ReportState } from "@/app/report/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Textarea, FieldError } from "@/components/ui/Field";
import { REPORT_REASONS, REPORT_INTRO, REPORT_CONFIRMATION } from "@/lib/copy";

export function ReportForm({
  subjectId,
  callSessionId,
  backHref,
}: {
  subjectId?: string;
  callSessionId?: string;
  backHref: string;
}) {
  const [state, action, pending] = useActionState<ReportState, FormData>(fileReport, {});

  if (state.ok) {
    return (
      <Card className="space-y-4 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">Report received</h1>
        <p className="text-muted">{REPORT_CONFIRMATION}</p>
        <Link href={backHref} className="text-sm font-semibold text-teal hover:underline">
          Back
        </Link>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Report a problem</h1>
        <p className="mt-2 text-sm text-muted">{REPORT_INTRO}</p>
      </div>
      <form action={action} className="space-y-5">
        {subjectId && <input type="hidden" name="subject_id" value={subjectId} />}
        {callSessionId && <input type="hidden" name="call_session_id" value={callSessionId} />}

        <fieldset className="space-y-2">
          <Label>What happened?</Label>
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-3 py-2.5 has-[:checked]:border-teal has-[:checked]:bg-mint">
              <input type="radio" name="category" value={r.value} required className="mt-1 accent-teal" />
              <span className="text-navy">{r.label}</span>
            </label>
          ))}
        </fieldset>

        <div>
          <Label htmlFor="body">Anything else? (optional)</Label>
          <Textarea id="body" name="body" maxLength={2000} placeholder="Add any detail that helps us understand." />
        </div>

        {state.error && <FieldError>{state.error}</FieldError>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit report"}
          </Button>
          <Link href={backHref} className="text-sm font-semibold text-muted hover:text-navy">
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  );
}
