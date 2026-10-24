"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOPICS } from "./data";

const href = (interest?: string) => (interest ? `/discover?topic=${interest}` : "/discover");

// Match free text to one of our topics ("garden" → Gardening). Anything we
// don't recognise goes to discovery unfiltered.
function matchTopic(text: string) {
  const t = text.trim().toLowerCase();
  if (!t) return undefined;
  return TOPICS.find((x) => x.label.toLowerCase().includes(t) || t.includes(x.interest.split("-")[0]));
}

// Hero "What would you like to talk about?" box. Sends people to discovery,
// filtered to the topic when we recognise it.
export function TopicSearch() {
  const router = useRouter();
  const [text, setText] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(href(matchTopic(text)?.interest));
      }}
      className="flex max-w-xl flex-col gap-3.5 rounded-[1.25rem] border border-gn-line bg-white p-[18px] shadow-[0_10px_30px_rgba(24,35,59,0.06)]"
    >
      <label htmlFor="gn-topic" className="font-serif text-[1.15rem] font-semibold text-gn-navy">
        What would you like to talk about?
      </label>
      <div className="flex flex-wrap gap-2.5">
        <input
          id="gn-topic"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Gardening, the Tudors, travel…"
          className="h-[52px] min-w-0 flex-[1_1_240px] rounded-xl border border-[#c9d2dc] bg-gn-paper px-4 text-base text-gn-navy placeholder:text-gn-muted"
        />
        <button
          type="submit"
          className="h-[52px] rounded-xl bg-gn-coral px-6 font-black text-gn-navy hover:brightness-95"
        >
          Find a Natterer
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.8rem] font-bold text-gn-muted">Popular:</span>
        {TOPICS.slice(0, 5).map((t) => (
          <Link
            key={t.interest}
            href={href(t.interest)}
            className="inline-flex min-h-9 items-center rounded-full border border-[#c9d2dc] bg-white px-3 text-[0.85rem] font-bold text-gn-navy hover:border-gn-navy"
          >
            {t.label}
          </Link>
        ))}
      </div>
    </form>
  );
}
