"use client";

import { useState, useTransition } from "react";
import { setBugStatus } from "@/app/admin/bugs/actions";
import { Card } from "@/components/ui/Card";
import type { BugReport, BugReportStatus } from "@/lib/types";

type Props = { bug: BugReport & { reporter: { display_name: string } | null } };

const STATUS_LABEL: Record<BugReportStatus, string> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

const STATUS_STYLE: Record<BugReportStatus, string> = {
  new: "bg-coral/15 text-coral",
  in_progress: "bg-mint text-navy",
  resolved: "bg-teal/15 text-teal",
  dismissed: "bg-line text-muted",
};

export function BugRow({ bug }: Props) {
  const [pending, startTransition] = useTransition();
  const [showContext, setShowContext] = useState(false);

  const who = bug.reporter?.display_name ?? bug.reporter_email ?? "Anonymous";
  const when = new Date(bug.created_at).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[bug.status]}`}>
            {STATUS_LABEL[bug.status]}
          </span>
          <span className="text-sm font-semibold text-navy">{who}</span>
          <span className="text-xs text-muted">{when}</span>
        </div>
        <select
          value={bug.status}
          disabled={pending}
          onChange={(e) => startTransition(() => setBugStatus(bug.id, e.target.value as BugReportStatus))}
          className="rounded-xl border border-line bg-white px-3 py-1.5 text-sm text-navy"
        >
          {(Object.keys(STATUS_LABEL) as BugReportStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <p className="whitespace-pre-line text-navy">{bug.description}</p>

      <p className="break-all text-sm text-muted">
        <span className="font-semibold">Page:</span> {bug.page_url}
      </p>

      <button
        type="button"
        onClick={() => setShowContext((s) => !s)}
        className="text-sm font-semibold text-teal hover:underline"
      >
        {showContext ? "Hide device details" : "Show device details"}
      </button>
      {showContext && (
        <dl className="grid grid-cols-1 gap-1 rounded-xl bg-mint/40 p-3 text-xs text-navy sm:grid-cols-2">
          {Object.entries(bug.context ?? {}).map(([k, v]) => (
            <div key={k} className={`break-all ${Array.isArray(v) && v.length > 1 ? "sm:col-span-2" : ""}`}>
              <dt className="inline font-semibold">{k}: </dt>
              <dd className="inline">
                {Array.isArray(v) ? (
                  v.length === 0 ? (
                    "—"
                  ) : (
                    <span className="block whitespace-pre-line pl-3">{v.join("\n")}</span>
                  )
                ) : (
                  String(v)
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
