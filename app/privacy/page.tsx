import { MarketingPage } from "@/components/MarketingPage";

export const metadata = { title: "Privacy — gonatter" };

export default function Privacy() {
  return (
    <MarketingPage title="Privacy">
      <p>
        This is a placeholder privacy notice for the gonatter MVP, subject to legal review. It
        summarises how we handle your information.
      </p>
      <h2>What we collect</h2>
      <p>
        Account details (name, email, phone), profile information you choose to add, conversation
        and call metadata needed to run the service, and payment information processed by Stripe.
      </p>
      <h2>Identity verification</h2>
      <p>
        Listeners complete identity verification through Stripe Identity. We store only the
        verification status, not the underlying documents.
      </p>
      <h2>How we use it</h2>
      <p>
        To operate the service, process payments and payouts, keep the platform safe, and respond to
        reports. We do not sell your personal data.
      </p>
      <h2>Your choices</h2>
      <p>
        You can request access to or deletion of your data. Some records may be retained where we
        have a legal obligation to keep them.
      </p>
    </MarketingPage>
  );
}
