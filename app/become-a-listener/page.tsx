import { MarketingPage } from "@/components/MarketingPage";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Become a listener — gonatter" };

export default function BecomeAListener() {
  return (
    <MarketingPage title="Become a listener">
      <p>
        Good at putting people at ease? On gonatter you can earn by doing something simple and
        human: being good company. You set your own rate and choose when you&apos;re available.
      </p>
      <h2>What you&apos;ll do</h2>
      <p>
        Have friendly, platonic conversations with people who&apos;d like someone to talk to. No
        scripts, no selling — just genuine chat.
      </p>
      <h2>How you get paid</h2>
      <p>
        You keep 75% of everything you earn. The first 2 minutes of each call are free for the
        caller — it helps people relax into the conversation, and calls that get past that point
        tend to run much longer. Charging (and your earnings) start from minute two onwards.
        Payouts are handled securely through Stripe, straight to your bank account.
      </p>
      <h2>Getting started</h2>
      <p>
        Create a listener account, complete a quick identity check, set up payouts, write a short
        profile and set your rate. Once you go live, you&apos;ll appear in discovery.
      </p>
      <div className="not-prose mt-6">
        <ButtonLink href="/signup?role=listener" size="lg">
          Get started as a listener
        </ButtonLink>
      </div>
    </MarketingPage>
  );
}
