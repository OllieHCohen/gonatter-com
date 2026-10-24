"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { NATTERERS, TOPICS } from "./data";
import { Tag } from "./Polaroid";

// Illustrative Natterer cards with a topic filter. Each card leads into
// discovery for that person's main topic (sign-up when signed out).
export function NattererGrid({ signedIn }: { signedIn: boolean }) {
  const [topic, setTopic] = useState<string | null>(null);
  const shown = topic ? NATTERERS.filter((n) => n.interests.includes(topic)) : NATTERERS;
  const chips = [{ label: "All", interest: null as string | null }, ...TOPICS];

  return (
    <>
      <div role="group" aria-label="Filter by topic" className="mb-7 flex flex-wrap gap-2">
        {chips.map((c) => {
          const on = topic === c.interest;
          return (
            <button
              key={c.label}
              type="button"
              aria-pressed={on}
              onClick={() => setTopic(c.interest)}
              className={cn(
                "min-h-11 rounded-full border px-[18px] text-[0.9rem] font-bold transition-colors",
                on
                  ? "border-gn-navy bg-gn-navy text-white"
                  : "border-[#c9d2dc] bg-white text-gn-navy hover:border-gn-navy",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
        {shown.map((n) => (
          <Link
            key={n.name}
            href={signedIn ? `/discover?topic=${n.interests[0]}` : "/signup"}
            className="group flex flex-col gap-2.5 rounded-lg border border-[#e1e6ec] bg-white p-3 pb-5 shadow-[0_10px_26px_rgba(24,35,59,0.08)] transition duration-200 hover:-translate-y-1 hover:-rotate-[0.4deg] hover:shadow-[0_22px_44px_rgba(24,35,59,0.16)]"
          >
            <div className="relative h-72 w-full overflow-hidden rounded">
              <Image src={n.img} alt={n.alt} fill sizes="(max-width: 640px) 90vw, 300px" className="object-cover" />
            </div>
            <span className="px-1.5 pt-1 font-serif text-[1.45rem] font-bold text-gn-navy">{n.name}</span>
            <span className="px-1.5 text-[0.9rem] text-gn-muted">{n.role}</span>
            <span className="flex flex-wrap gap-1.5 px-1.5">
              {n.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </span>
          </Link>
        ))}
      </div>
      {shown.length === 0 && (
        <p className="mt-6 text-gn-body">
          No examples for that topic here yet.{" "}
          <Link href={signedIn ? "/discover" : "/signup"} className="font-bold underline underline-offset-2">
            See who&apos;s available
          </Link>
          .
        </p>
      )}
    </>
  );
}
