import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FREE_MINUTES } from "@/lib/copy";

// Illustrative listener cards for the social-proof strip — monograms only,
// no faces, clearly examples rather than real accounts.
const EXAMPLE_LISTENERS = [
  { initial: "M", name: "Maya", rating: "4.9", tags: ["Gardening", "Films & TV"], rate: "45p/min", tone: "bg-teal" },
  { initial: "D", name: "Dev", rating: "4.8", tags: ["Sport", "Cooking"], rate: "30p/min", tone: "bg-coral" },
  { initial: "R", name: "Rosa", rating: "5.0", tags: ["Books", "Just listening"], rate: "50p/min", tone: "bg-navy" },
];

const TRUST_POINTS = [
  {
    glyph: "✓",
    title: "Real, verified humans",
    body: "Every listener has passed an ID check. No bots, no scripts — a genuine person on the other end.",
  },
  {
    glyph: "⏱",
    title: "Billed by the second",
    body: "Rates are per minute but you're billed by the second, with a hard cap you choose before the call.",
  },
  {
    glyph: "★",
    title: "Rated by callers",
    body: "Both sides rate every call, so the best listeners rise to the top of discovery.",
  },
  {
    glyph: "🛡",
    title: "You're in control",
    body: "Block or report anyone, end any call instantly, and manage it all from your own block list.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Find someone",
    body: "Browse listeners by interests, location and rating. See their bio and their per-minute rate up front.",
  },
  {
    n: "2",
    title: "Say hi",
    body: "Break the ice with a message first. Messaging is completely free — you only ever pay during a call.",
  },
  {
    n: "3",
    title: "Talk — 2 minutes free",
    body: "Start a voice call. The first 2 minutes cost nothing, so charging only begins once you know you've clicked.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — value proposition in five seconds, voice visual instead of chat bubbles. */}
        <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="w-fit rounded-full bg-success/15 px-4 py-2 text-sm font-bold text-success">
                {`🎁 ${FREE_MINUTES.badge} on every call`}
              </p>
              <h1 className="mt-5 text-4xl font-bold text-navy md:text-5xl">
                Real people. Real voices. Whenever you need to talk.
              </h1>
              <p className="mt-5 max-w-prose text-lg text-muted">
                gonatter connects you with friendly, ID-verified people who are genuinely glad to
                chat — about your day, your interests, or nothing much at all. Good company, the
                way a phone call to a friend used to be.
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
                Billed by the second · You set the spend cap · Free messaging · 18+
              </p>
            </div>

            <VoiceVisual />
          </div>
        </section>

        {/* Trust strip — four quick proofs. */}
        <section className="mx-auto max-w-6xl px-5 pb-16" aria-label="Why people trust gonatter">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((t) => (
              <Card key={t.title}>
                <span
                  aria-hidden
                  className="grid h-10 w-10 place-items-center rounded-full bg-mint text-lg font-bold text-teal"
                >
                  {t.glyph}
                </span>
                <h2 className="mt-3 text-lg font-semibold text-navy">{t.title}</h2>
                <p className="mt-1.5 text-sm text-muted">{t.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works — three calm steps. */}
        <section className="bg-mint/50 py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center font-display text-3xl font-bold text-navy">How it works</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-teal font-display text-xl font-bold text-white">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold text-navy">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-muted">{s.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center">
              <ButtonLink href="/how-it-works" variant="ghost">
                See the full details — including exactly how pricing works →
              </ButtonLink>
            </p>
          </div>
        </section>

        {/* Social proof — what listener cards look like (illustrative). */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center font-display text-3xl font-bold text-navy">
            Who you&apos;ll find here
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted">
            Listeners set their own rates and share what they love talking about. Examples below —
            meet the real people inside.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {EXAMPLE_LISTENERS.map((l) => (
              <Card key={l.name}>
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${l.tone} font-display text-xl font-bold text-white`}
                  >
                    {l.initial}
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold text-navy">{l.name}</p>
                    <p className="text-sm">
                      <span className="font-semibold text-sunshine">★</span>
                      <span className="ml-1 font-semibold text-navy">{l.rating}</span>
                      <span className="ml-2 font-semibold text-teal">{l.rate}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {l.tags.map((t) => (
                    <span key={t} className="rounded-full bg-mint px-3 py-1 text-sm text-navy">
                      {t}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Honest positioning — navy band. */}
        <section className="bg-navy py-14 text-center">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
              Good company — not therapy, not a crisis line.
            </h2>
            <p className="mt-4 text-white/80">
              We&apos;re honest about what gonatter is: friendly, platonic conversation with real
              people. If you ever need urgent or professional help, we&apos;ll always show you
              where to find it.
            </p>
            <p className="mt-6">
              <ButtonLink href="/safety" variant="secondary">
                How we keep gonatter safe
              </ButtonLink>
            </p>
          </div>
        </section>

        {/* Become-a-listener CTA band. */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <Card className="text-center md:px-16 md:py-12">
            <h2 className="font-display text-3xl font-bold text-navy">
              Get paid to be good company
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              Set your own rate, choose when you&apos;re available, and keep 75% of everything you
              earn — paid out securely through Stripe.
            </p>
            <p className="mt-6">
              <ButtonLink href="/become-a-listener" size="lg">
                Become a Listener
              </ButtonLink>
            </p>
          </Card>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

// The hero visual: soft floating brand blobs behind an illustrative in-call
// card — monogram avatar (no faces), live waveform, the free 2 minutes
// counting, and a spend-cap meter. Pure CSS; keyframes live in globals.css.
function VoiceVisual() {
  const bars = [0.5, 0.9, 0.65, 1, 0.45, 0.8, 0.6, 0.95, 0.5, 0.75, 0.4, 0.85];
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md">
      {/* Colour blobs */}
      <div className="gn-float-a absolute -left-8 -top-10 h-48 w-48 rounded-full bg-teal/25 blur-2xl" />
      <div className="gn-float-b absolute -bottom-8 -right-6 h-56 w-56 rounded-full bg-coral/20 blur-2xl" />
      <div className="gn-float-a absolute right-10 top-0 h-28 w-28 rounded-full bg-sunshine/30 blur-xl" />

      {/* In-call card */}
      <div className="relative rounded-[2rem] border border-line bg-white p-7 shadow-lg">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-teal font-display text-2xl font-bold text-white">
            M
          </span>
          <div>
            <p className="font-display text-xl font-bold text-navy">Maya</p>
            <p className="text-sm text-muted">
              <span className="font-semibold text-sunshine">★</span>{" "}
              <span className="font-semibold text-navy">4.9</span> · Listener
            </p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> On a call
          </span>
        </div>

        {/* Waveform */}
        <div className="mt-6 flex h-14 items-end justify-center gap-1.5">
          {bars.map((h, i) => (
            <span
              key={i}
              className="gn-eq w-2 rounded-full bg-teal"
              style={{ height: `${h * 100}%`, animationDelay: `${(i % 5) * 0.13}s` }}
            />
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-success/10 px-4 py-2.5">
            <span className="text-sm font-bold text-success">{"🎁 Free minutes"}</span>
            <span className="font-display text-lg font-bold tabular-nums text-success">1:24</span>
          </div>
          <div className="rounded-xl bg-mint px-4 py-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-navy">Your spend cap</span>
              <span className="font-semibold text-muted">£0.00 of £15.00</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full w-[4%] rounded-full bg-teal" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
