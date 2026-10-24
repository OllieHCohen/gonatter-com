"use client";

import { useState } from "react";
import { SPARKS } from "./data";

export function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

// Dark card that cycles through the opening "spark" questions.
export function SparkCard() {
  const [i, setI] = useState(0);
  const spark = SPARKS[i];

  return (
    <div className="flex min-h-[340px] flex-[1_1_460px] flex-col justify-between gap-7 rounded-[1.4rem] bg-gn-navy p-10 text-white">
      <div className="flex items-center justify-between">
        <span className="text-[0.8rem] font-black tracking-[0.12em] text-gn-sage">
          SPARK {i + 1} OF {SPARKS.length}
        </span>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gn-navy-700 text-gn-coral">
          <SparkIcon />
        </span>
      </div>
      <div aria-live="polite" className="flex flex-col gap-3">
        <p className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-tight">{spark.q}</p>
        <p className="text-[#c3cdd9]">{spark.why}</p>
      </div>
      <button
        type="button"
        onClick={() => setI((i + 1) % SPARKS.length)}
        className="self-start rounded-full bg-gn-coral px-6 py-3 font-black text-gn-navy hover:brightness-95"
      >
        Try another spark
      </button>
    </div>
  );
}
