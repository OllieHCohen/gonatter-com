"use client";

import { useState } from "react";
import { LogoMark } from "@/components/Logo";
import { PAIRINGS } from "./data";
import { Polaroid, Tag } from "./Polaroid";

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

// "Pairings" carousel: a caller and a Natterer who'd get on (illustrative).
export function Pairings() {
  const [i, setI] = useState(0);
  const p = PAIRINGS[i];
  const go = (d: number) => setI((i + d + PAIRINGS.length) % PAIRINGS.length);
  const btn =
    "grid h-12 w-12 place-items-center rounded-full border border-[#c9d2dc] bg-white text-gn-navy hover:bg-gn-mist";

  return (
    <section className="mx-auto max-w-6xl px-5 py-24" aria-roledescription="carousel" aria-label="Example pairings">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div className="flex max-w-3xl flex-col gap-3.5" aria-live="polite">
          <p className="text-sm font-black tracking-[0.17em] text-gn-coral-ink uppercase">Pairings · {p.topic}</p>
          <h2 className="font-serif text-[clamp(1.75rem,3.4vw,2.6rem)] font-bold leading-tight text-gn-navy">{p.line}</h2>
        </div>
        <div className="flex gap-2.5">
          <button type="button" onClick={() => go(-1)} aria-label="Previous pairing" className={btn}>
            <Arrow dir="left" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next pairing" className={btn}>
            <Arrow dir="right" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-7">
        <Polaroid {...p.caller} label="Caller" tilt={-2} className="w-full max-w-[380px]" />
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-[7px] w-[7px] rounded-full bg-gn-coral" />
          <span className="h-[7px] w-[7px] rounded-full bg-[#f0b7a5]" />
          <span className="grid h-[60px] w-[60px] place-items-center rounded-full bg-gn-navy">
            <LogoMark height={18} onDark />
          </span>
          <span className="h-[7px] w-[7px] rounded-full bg-[#f0b7a5]" />
          <span className="h-[7px] w-[7px] rounded-full bg-gn-coral" />
        </div>
        <Polaroid {...p.natterer} label="Natterer" tilt={1.5} className="w-full max-w-[380px]">
          <span className="mt-3 flex flex-wrap gap-1.5">
            {p.natterer.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </span>
        </Polaroid>
      </div>
      <p className="mt-8 text-center text-sm text-gn-muted">
        Illustrative pairing {i + 1} of {PAIRINGS.length}
      </p>
    </section>
  );
}
