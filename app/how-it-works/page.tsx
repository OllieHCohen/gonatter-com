import { MarketingPage } from "@/components/MarketingPage";

export const metadata = { title: "How it works — gonatter" };

export default function HowItWorks() {
  return (
    <MarketingPage title="How it works">
      <p>
        gonatter connects you with real people who are happy to talk — about your day, your
        interests, or whatever&apos;s on your mind. Here&apos;s how a chat works.
      </p>
      <h2>1. Find someone</h2>
      <p>
        Browse available listeners, see what they like to talk about, and read their rate. Every
        listener has had their identity verified.
      </p>
      <h2>2. Say hi</h2>
      <p>
        Send a quick message to break the ice. Messaging is free — you&apos;re only ever charged
        during a call.
      </p>
      <h2>3. Talk — the first 2 minutes are free</h2>
      <p>
        When you&apos;re both ready, start an audio call. The first 2 minutes of every call are
        free, so you can see whether you gel before any charging starts. After that you&apos;re
        only charged for the minutes you actually use, up to the length you chose (30 or 60
        minutes), and either person can end the call at any time.
      </p>
      <h2>Fair and platonic</h2>
      <p>
        gonatter is for friendly, respectful conversation only. It is not therapy, dating, or a
        crisis service. Listeners keep 75% of what you pay.
      </p>
    </MarketingPage>
  );
}
