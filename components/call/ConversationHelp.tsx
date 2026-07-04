"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getConversationStarters } from "@/app/call/actions";
import { Card } from "@/components/ui/Card";

type Props = {
  conversationId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  topics: string[];
};

// Shown to both parties on the call page: who they're talking to, plus three
// AI-suggested openers so the conversation never starts cold.
export function ConversationHelp({ conversationId, name, bio, photoUrl, topics }: Props) {
  const [starters, setStarters] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getConversationStarters(conversationId).then((res) => {
      if (!cancelled) setStarters(res.starters);
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  return (
    <Card className="mt-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-mint">
          {photoUrl ? (
            <Image src={photoUrl} alt="" width={56} height={56} className="h-14 w-14 object-cover" />
          ) : (
            <span className="text-xl">🙂</span>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-navy">About {name}</h2>
          {bio && <p className="mt-1 text-sm text-muted">{bio}</p>}
          {topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topics.map((t) => (
                <span key={t} className="rounded-full bg-mint px-2.5 py-0.5 text-xs text-navy">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-navy">Not sure how to start? Try one of these:</h3>
        {starters === null ? (
          <div className="mt-2 animate-pulse space-y-2" aria-hidden>
            <div className="h-8 rounded-xl bg-mint/60" />
            <div className="h-8 rounded-xl bg-mint/60" />
            <div className="h-8 rounded-xl bg-mint/60" />
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {starters.map((s) => (
              <li key={s} className="rounded-xl bg-mint/50 px-3 py-2 text-sm text-navy">
                &ldquo;{s}&rdquo;
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
