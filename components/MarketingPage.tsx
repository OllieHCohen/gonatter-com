import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export function MarketingPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <h1 className="font-display text-3xl font-bold text-navy">{title}</h1>
        <div className="prose-gonatter mt-6 space-y-4 text-navy [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_p]:text-muted [&_li]:text-muted">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
