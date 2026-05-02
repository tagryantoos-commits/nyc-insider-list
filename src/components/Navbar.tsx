import Link from "next/link";
import { PRICE_MONTHLY } from "@/lib/constants";

export default function Navbar({ eventCount }: { eventCount: number }) {
  return (
    <nav className="border-b border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#fafafa]"
        >
          NYC Insider List
        </Link>

        <div className="flex items-center gap-5">
          <span className="hidden text-[13px] text-[#52525b] sm:inline">
            {eventCount.toLocaleString()} events
          </span>
          <Link
            href="/subscribe"
            className="rounded-md border border-white/[0.15] px-4 py-1.5 text-[13px] font-medium text-[#fafafa] transition hover:bg-white hover:text-[#09090b]"
          >
            Subscribe {PRICE_MONTHLY}/mo
          </Link>
        </div>
      </div>
    </nav>
  );
}
