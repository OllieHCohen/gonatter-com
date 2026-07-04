import { MarketingPage } from "@/components/MarketingPage";

export const metadata = { title: "Terms — gonatter" };

export default function Terms() {
  return (
    <MarketingPage title="Terms of use">
      <p>
        These are placeholder terms for the gonatter MVP and are subject to legal review before
        launch. By using gonatter you agree to the following in principle.
      </p>
      <h2>Eligibility</h2>
      <p>You must be 18 or over to use gonatter.</p>
      <h2>Acceptable use</h2>
      <p>
        gonatter is for friendly, platonic conversation. Sexual, abusive, threatening, or illegal
        content is prohibited, as is any contact directed at minors. We may suspend or remove
        accounts that break these rules.
      </p>
      <h2>Not a crisis or professional service</h2>
      <p>
        gonatter does not provide medical, psychological, legal, or emergency services. It is not a
        substitute for professional help.
      </p>
      <h2>Payments</h2>
      <p>
        The first 2 minutes of every call are free of charge. Beyond that, callers are charged for
        the time actually spent on a call, up to the length they authorise. Listeners receive 75%
        of the amount charged; gonatter retains a 25% platform fee. Payments are processed by
        Stripe.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms. Continued use means you accept the current version.</p>
    </MarketingPage>
  );
}
