import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/ui/Card";

// Deliberately does NOT use requireUser — that guard redirects non-active
// accounts here, so using it would loop.
export default async function SuspendedPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile?.status === "active") redirect("/");

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16">
        <Card className="space-y-4 text-center">
          <h1 className="font-display text-2xl font-bold text-navy">Your account is suspended</h1>
          <p className="text-muted">
            Your gonatter account has been suspended and you can&apos;t use the platform right
            now. If you think this is a mistake, or you&apos;d like to appeal, please contact us
            at{" "}
            <a href="mailto:support@gonatter.com" className="font-semibold text-teal hover:underline">
              support@gonatter.com
            </a>{" "}
            and we&apos;ll look into it.
          </p>
          <form action={logoutAction}>
            <button className="rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-navy hover:bg-mint">
              Log out
            </button>
          </form>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
