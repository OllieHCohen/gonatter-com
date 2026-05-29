import { requireUser } from "@/lib/auth";
import { ReportForm } from "@/components/ReportForm";

type Search = { searchParams: Promise<{ subject?: string; call?: string }> };

export const metadata = { title: "Report a problem — gonatter" };

export default async function ReportPage({ searchParams }: Search) {
  await requireUser();
  const { subject, call } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-lg px-5 py-10">
      <ReportForm subjectId={subject} callSessionId={call} backHref="/messages" />
    </main>
  );
}
