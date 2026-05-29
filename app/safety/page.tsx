import Link from "next/link";
import { MarketingPage } from "@/components/MarketingPage";
import { NOT_A_CRISIS, PLATONIC_REMINDER } from "@/lib/copy";

export const metadata = { title: "Safety — gonatter" };

export default function Safety() {
  return (
    <MarketingPage title="Safety">
      <p>{NOT_A_CRISIS}</p>
      <p>
        If you or someone else is in crisis or danger, please see our{" "}
        <Link href="/support" className="font-semibold text-teal underline-offset-2 hover:underline">
          support resources
        </Link>{" "}
        for ways to get urgent help.
      </p>
      <h2>Respectful conversation</h2>
      <p>{PLATONIC_REMINDER}</p>
      <h2>Reporting</h2>
      <p>
        If something doesn&apos;t feel right, you can report it from any conversation or after a
        call. Our team reviews every report. Anything sexual, abusive, or directed at someone under
        18 is strictly prohibited and will be acted on.
      </p>
      <h2>Verified listeners</h2>
      <p>
        Every listener completes identity verification before they can take calls. This is private
        and never shown to callers.
      </p>
      <h2>For adults only</h2>
      <p>gonatter is for people aged 18 and over.</p>
    </MarketingPage>
  );
}
