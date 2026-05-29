"use client";

import { useState, useTransition } from "react";
import { resolveReport } from "@/app/admin/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { REPORT_REASONS } from "@/lib/copy";
import type { AdminReport } from "@/app/admin/page";

const CATEGORY_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]));

const STATE_TONE: Record<string, string> = {
  open: "bg-error/10 text-error",
  reviewing: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
  dismissed: "bg-line/40 text-muted",
};

export function ReportRow({ report }: { report: AdminReport }) {
  const [resolution, setResolution] = useState(report.resolution ?? "");
  const [pending, startTransition] = useTransition();

  function act(state: "reviewing" | "resolved" | "dismissed") {
    startTransition(async () => {
      await resolveReport(report.id, state, resolution);
    });
  }

  const closed = report.state === "resolved" || report.state === "dismissed";

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-navy">{CATEGORY_LABEL[report.category] ?? report.category}</p>
          <p className="text-xs text-muted">
            {report.reporter?.display_name ?? "Someone"} reported{" "}
            {report.subject?.display_name ?? "an account"} ·{" "}
            {new Date(report.created_at).toLocaleString("en-GB")}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATE_TONE[report.state]}`}>
          {report.state}
        </span>
      </div>

      {report.body && <p className="rounded-lg bg-canvas px-3 py-2 text-sm text-navy">{report.body}</p>}

      {!closed && (
        <>
          <input
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Resolution note (optional)"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy"
          />
          <div className="flex flex-wrap gap-2">
            {report.state === "open" && (
              <Button size="md" variant="secondary" onClick={() => act("reviewing")} disabled={pending}>
                Mark reviewing
              </Button>
            )}
            <Button size="md" onClick={() => act("resolved")} disabled={pending}>
              Resolve
            </Button>
            <Button size="md" variant="ghost" onClick={() => act("dismissed")} disabled={pending}>
              Dismiss
            </Button>
          </div>
        </>
      )}

      {closed && report.resolution && (
        <p className="text-sm text-muted">Resolution: {report.resolution}</p>
      )}
    </Card>
  );
}
