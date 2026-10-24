import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LogoMark } from "@/components/Logo";
import { Polaroid } from "@/components/home/Polaroid";
import { TopicSearch } from "@/components/home/TopicSearch";
import { NattererGrid } from "@/components/home/NattererGrid";
import { SparkCard, SparkIcon } from "@/components/home/SparkCard";
import { Pairings } from "@/components/home/Pairings";
import { getSessionProfile } from "@/lib/auth";

const eyebrow = "text-sm font-black tracking-[0.17em] uppercase text-gn-coral-ink";
const h2 = "font-serif text-[clamp(2.1rem,4vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.02em] text-gn-navy";

const STEPS = [
  {
    title: "Choose a topic",
    body: "Something you want to learn, share or simply talk about.",
    icon: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
    tone: "bg-gn-sage-50 text-gn-sage-ink",
  },
  {
    title: "See a few appealing people",
    body: "Human profiles: who they are and what they love talking about.",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M17 14c2.6 0 4.5 1.8 4.5 4.5" />
      </>
    ),
    tone: "bg-gn-blush text-[#9a4326]",
  },
  {
    title: "Say hello",
    body: "Send a message first to break the ice. Messaging is always free.",
    icon: <path d="M4 4h16v12H8l-4 4z" />,
    tone: "bg-gn-sage-50 text-gn-sage-ink",
  },
];

const SAFETY = [
  {
    title: "For grown-ups",
    body: "A service for adults, made clear in the product, the sign-up and the terms.",
    icon: (
      <>
        <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
        <path d="M6 2v2M10 2v2M14 2v2" />
      </>
    ),
  },
  {
    title: "Verified Natterers",
    body: "Every Natterer passes an ID check before they can take a call.",
    icon: <path d="M20 6 9 17l-5-5" />,
  },
  {
    title: "Protected calls",
    body: "Calls run through gonatter, so personal phone numbers are never shared.",
    icon: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  },
  {
    title: "Block, report, end",
    body: "End any call instantly, block anyone, and report concerns to a real person.",
    icon: <path d="M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5" />,
  },
];

function Icon({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

export default async function Home() {
  const signedIn = !!(await getSessionProfile())?.profile;

  return (
    <div className="flex min-h-dvh flex-col bg-gn-paper font-brand text-gn-navy">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex max-w-6xl flex-wrap items-center gap-14 px-5 pb-24 pt-16 md:pt-20">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-5">
            <p className={eyebrow}>Connection and curiosity. Time to talk.</p>
            <h1 className="font-serif text-[clamp(2.6rem,5.4vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.025em]">
              Find someone to talk to about anything that matters to you.
            </h1>
            <p className="max-w-xl text-xl leading-relaxed text-gn-body">
              Have a real voice conversation with a friendly, ID-verified person. To learn
              something, share a passion, or simply enjoy someone&apos;s company.
            </p>
            <div className="mt-2">
              <TopicSearch signedIn={signedIn} />
            </div>
            <p className="text-sm text-gn-muted">
              First 2 minutes free on every call · Billed by the second · Free messaging · Adults only
            </p>
          </div>

          <div className="relative hidden h-[560px] min-w-0 flex-[1_1_480px] md:block" aria-hidden="true">
            <Polaroid
              img="/home/maya.jpg"
              alt=""
              name="Maya"
              label="Caller"
              role="History undergraduate, Bristol"
              tilt={-2.5}
              imgClass="h-[300px]"
              className="absolute left-0 top-2.5 w-[50%]"
            />
            <Polaroid
              img="/home/peter.jpg"
              alt=""
              name="Peter"
              label="Natterer"
              role="Veteran, 32 years of service"
              tilt={2}
              imgClass="h-[280px]"
              className="absolute right-0 top-[190px] w-[48%]"
            />
            <span className="absolute left-[calc(50%-32px)] top-[215px] z-10 grid h-16 w-16 place-items-center rounded-full bg-gn-navy shadow-[0_10px_24px_rgba(24,35,59,0.3)]">
              <LogoMark height={20} onDark />
            </span>
            <div className="absolute bottom-0 left-[6%] z-10 w-[250px] rounded-2xl border border-gn-line bg-gn-mist px-[18px] py-4">
              <p className="font-serif text-[1.05rem] font-bold">Real people. Real exchange.</p>
              <p className="mt-1.5 text-[0.9rem] text-gn-body">Good conversation is a two-way street.</p>
            </div>
          </div>
        </section>

        {/* Proposition */}
        <section className="bg-gn-navy text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-14 px-5 py-24">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
              <p className="text-sm font-black tracking-[0.17em] text-gn-coral uppercase">The proposition</p>
              <p className="font-serif text-[1.85rem] leading-snug text-[#9aa8ba]">
                Not a meeting. Not a lesson.
                <br />
                Not therapy. Not social media.
              </p>
              <h2 className="font-serif text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.02em]">
                Just two people, talking.
              </h2>
              <p className="max-w-[600px] text-lg leading-relaxed text-gn-on-dark">
                Sometimes to practise Spanish with someone who grew up in Madrid. Sometimes for
                advice from a gardener of forty years. Sometimes because you&apos;re fascinated by
                military history. Sometimes just because two interesting people enjoy each
                other&apos;s company.
              </p>
              <p className="mt-2">
                <span className="inline-block bg-gn-coral px-[18px] py-2.5 font-black text-gn-navy">
                  The conversation is the product.
                </span>
              </p>
            </div>
            <div className="grid min-w-0 flex-[1_1_420px] grid-cols-2 gap-3.5">
              <div className="relative h-[300px] overflow-hidden rounded-2xl">
                <Image src="/home/margaret.jpg" alt="A gardener laughing on the phone among roses" fill sizes="(max-width: 768px) 45vw, 300px" className="object-cover" />
              </div>
              <div className="relative mt-10 h-[300px] overflow-hidden rounded-2xl">
                <Image src="/home/sarah.jpg" alt="A baker kneading dough and laughing, earbud in" fill sizes="(max-width: 768px) 45vw, 300px" className="object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Natterers */}
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-24">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
            <div className="flex max-w-2xl flex-col gap-3.5">
              <p className={eyebrow}>Meet the Natterers</p>
              <h2 className={h2}>People you&apos;d choose, not experts for hire.</h2>
            </div>
            <p className="max-w-[420px] text-[1.05rem] leading-relaxed text-gn-body">
              Subject knowledge matters, but being genuinely good company matters more. Every
              Natterer is ID-verified before they take a call.
            </p>
          </div>
          <NattererGrid signedIn={signedIn} />
          <p className="mt-7 text-sm text-gn-muted">
            Illustrative examples. Sign up to meet the real Natterers on gonatter.
          </p>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-5 pb-24 pt-10">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-3.5">
              <p className={eyebrow}>How it works</p>
              <h2 className={h2}>Easy enough to try on impulse.</h2>
            </div>
            <p className="max-w-[440px] text-[1.05rem] leading-relaxed text-gn-body">
              No membership, no course, no profile-building exercise.{" "}
              <strong className="text-gn-navy">Informality is a feature, not a weakness.</strong>
            </p>
          </div>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex min-h-[300px] flex-col gap-4 rounded-[1.1rem] border border-gn-line bg-gn-mist p-7">
                <span className="font-serif text-xl font-bold text-gn-coral-ink">0{i + 1}</span>
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${s.tone}`}>
                  <Icon>{s.icon}</Icon>
                </span>
                <h3 className="font-serif text-2xl font-semibold">{s.title}</h3>
                <p className="mt-auto leading-relaxed text-gn-body">{s.body}</p>
              </li>
            ))}
            <li className="flex min-h-[300px] flex-col gap-4 rounded-[1.1rem] bg-gn-navy p-7 text-white">
              <span className="font-serif text-xl font-bold text-gn-sage">04</span>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gn-navy-700">
                <Icon>
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
                </Icon>
              </span>
              <h3 className="font-serif text-2xl font-semibold">Talk</h3>
              <p className="mt-auto leading-relaxed text-gn-on-dark">
                The first 2 minutes are free, then you&apos;re billed by the second, up to a limit
                you set before the call.
              </p>
            </li>
          </ol>
          <p className="mt-8">
            <Link href="/how-it-works" className="font-bold underline underline-offset-4 hover:text-gn-coral-ink">
              See exactly how pricing works
            </Link>
          </p>
        </section>

        {/* Sparks */}
        <section id="sparks" className="border-y border-[#e1e6ec] bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-stretch gap-12 px-5 py-24">
            <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-[18px]">
              <p className={`${eyebrow} flex items-center gap-2.5`}>
                <SparkIcon />
                Conversation sparks
              </p>
              <h2 className={h2}>The first thirty seconds, made easy.</h2>
              <p className="max-w-[520px] text-lg leading-relaxed text-gn-body">
                The hardest moment is the beginning. So every call comes with{" "}
                <strong className="text-gn-navy">sparks</strong>, great questions that get things
                going, so nobody stares at a blank first minute.
              </p>
              <p className="max-w-[520px] leading-relaxed text-gn-muted">
                People leave a little more practised at asking a good question, and at really
                listening to the answer.
              </p>
            </div>
            <SparkCard />
          </div>
        </section>

        <Pairings />

        {/* Safety */}
        <section id="safety" className="mx-auto max-w-6xl px-5 pb-24 pt-6">
          <div className="mb-9 flex flex-col gap-3.5">
            <p className={eyebrow}>Safety &amp; trust</p>
            <h2 className={h2}>Safety is part of the brand, not the small print.</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
            {SAFETY.map((s) => (
              <div key={s.title} className="flex flex-col gap-3 rounded-[1.1rem] bg-gn-navy p-7 text-white">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-gn-navy-700">
                  <Icon className="h-5 w-5">{s.icon}</Icon>
                </span>
                <h3 className="mt-1.5 font-brand text-xl font-black">{s.title}</h3>
                <p className="leading-relaxed text-gn-on-dark">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-4 rounded-[1.1rem] border border-gn-line bg-gn-mist px-8 py-7">
            <span className={eyebrow}>Good to know</span>
            <p className="min-w-0 flex-[1_1_480px] font-serif text-[1.2rem] leading-normal">
              gonatter is friendly conversation, not therapy or a crisis line. If you ever need
              urgent help, we&apos;ll always point you to the right place.{" "}
              <Link href="/safety" className="font-brand text-base font-bold underline underline-offset-4 hover:text-gn-coral-ink">
                How we keep gonatter safe
              </Link>
            </p>
          </div>
        </section>

        {/* Request + become a Natterer */}
        <section className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-6 px-5 pb-24">
          <div className="flex flex-col gap-4 rounded-[1.4rem] border border-gn-line bg-white p-10">
            <p className={eyebrow}>Can&apos;t see the right person?</p>
            <h2 className="font-serif text-4xl font-bold leading-tight">Tell us who you&apos;d love to talk to.</h2>
            <p className="text-[1.05rem] leading-relaxed text-gn-body">
              Someone who has sailed the Atlantic? Anyone who lived in Lisbon in the 70s? Drop us
              a line and we&apos;ll look for the right Natterer by hand.
            </p>
            <a
              href="mailto:support@gonatter.com?subject=I%27d%20love%20to%20talk%20to%E2%80%A6"
              className="mt-auto self-start rounded-full bg-gn-navy px-6 py-3 font-black text-white hover:bg-gn-navy-700"
            >
              Request a Natterer
            </a>
          </div>
          <div className="flex flex-col overflow-hidden rounded-[1.4rem] bg-gn-navy text-white">
            <div className="relative h-60">
              <Image src="/home/arthur.jpg" alt="An older man smiling on the phone in an armchair surrounded by books" fill sizes="(max-width: 768px) 95vw, 600px" className="object-cover object-[center_30%]" />
            </div>
            <div className="flex flex-col gap-3.5 px-10 pb-10 pt-8">
              <p className="text-sm font-black tracking-[0.17em] text-gn-coral uppercase">Become a Natterer</p>
              <h2 className="font-serif text-4xl font-bold leading-tight">Good company is a skill. Get paid for yours.</h2>
              <p className="text-[#c3cdd9]">
                Set your own rate, choose when you&apos;re available, and keep 75% of what you earn.
              </p>
              <Link
                href="/become-a-listener"
                className="mt-1.5 self-start rounded-full bg-gn-coral px-6 py-3 font-black text-gn-navy hover:brightness-95"
              >
                Apply to be a founding Natterer
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
