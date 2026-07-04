import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WHAT_IS, BRAND, FREE_MINUTES } from "@/lib/copy";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — warm, calm, not loud (Brand §2, §6). */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="font-display text-sm font-semibold uppercase tracking-wide text-teal">
                {BRAND.tagline}
              </p>
              <h1 className="mt-4 text-4xl font-bold text-navy md:text-5xl">
                Fancy a chat? There&apos;s someone here to talk to.
              </h1>
              <p className="mt-5 max-w-prose text-lg text-muted">{WHAT_IS.body}</p>
              <p className="mt-5 w-fit rounded-full bg-success/15 px-5 py-2.5 font-semibold text-success">
                {`🎁 ${FREE_MINUTES.badge} on every call`}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/signup" size="lg">
                  Talk to someone
                </ButtonLink>
                <ButtonLink href="/become-a-listener" variant="secondary" size="lg">
                  Become a Listener
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-muted">
                No pressure. Start with a message and see how it feels.
              </p>
            </div>

            {/* Calm illustrative panel using brand bubbles, no faces/sparkles. */}
            <div className="relative">
              <div className="rounded-[2rem] bg-mint p-8 md:p-12">
                <div className="flex flex-col gap-4">
                  <Bubble side="left" tone="teal">
                    Are you free to talk?
                  </Bubble>
                  <Bubble side="right" tone="coral">
                    Of course — I&apos;m here. How&apos;s your day been?
                  </Bubble>
                  <Bubble side="left" tone="teal">
                    Honestly, a bit quiet. Nice to hear a voice.
                  </Bubble>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three calm reassurances */}
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <h3 className="text-lg font-semibold text-navy">Real humans, not bots</h3>
              <p className="mt-2 text-muted">
                Talk to a real person who&apos;s genuinely glad you called. The way a phone
                call to a friend used to be.
              </p>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold text-navy">
                First 2 minutes free, then you&apos;re in control
              </h3>
              <p className="mt-2 text-muted">
                {`${FREE_MINUTES.line} After that you're only charged for the time you actually talk, and you can end the call whenever you like.`}
              </p>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold text-navy">Honest about what we are</h3>
              <p className="mt-2 text-muted">
                Good company — not therapy or a crisis service. If you ever need urgent or
                professional help, we&apos;ll always show you where to find it.
              </p>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Bubble({
  children,
  side,
  tone,
}: {
  children: React.ReactNode;
  side: "left" | "right";
  tone: "teal" | "coral";
}) {
  const align = side === "left" ? "self-start" : "self-end";
  const colour = tone === "teal" ? "bg-teal text-white" : "bg-coral text-white";
  const corner = side === "left" ? "rounded-bl-md" : "rounded-br-md";
  return (
    <div
      className={`${align} max-w-[80%] rounded-2xl ${corner} ${colour} px-4 py-3 text-[15px] shadow-sm`}
    >
      {children}
    </div>
  );
}
