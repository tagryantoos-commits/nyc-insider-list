import Link from "next/link";
import { PRICE_MONTHLY } from "@/lib/constants";

export default function SubscribeCTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 text-center">
      <h2 className="text-2xl font-semibold text-[#fafafa]">
        Get these events in your calendar
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[#52525b]">
        Subscribe for {PRICE_MONTHLY}/month. All 9 category calendars sync to
        Google Calendar. Cancel anytime.
      </p>
      <Link
        href="/subscribe"
        className="mt-6 inline-block rounded-md border border-white/[0.15] px-6 py-2.5 text-[14px] font-medium text-[#fafafa] transition hover:bg-white hover:text-[#09090b]"
      >
        Subscribe
      </Link>
    </section>
  );
}
