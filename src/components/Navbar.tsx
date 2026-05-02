import Link from "next/link";
import { SITE_NAME, PRICE_MONTHLY } from "@/lib/constants";

export default function Navbar({ eventCount }: { eventCount: number }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080b16]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="font-[family-name:var(--font-fraunces)] text-xl font-bold tracking-tight">
          {SITE_NAME}
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-white/40 sm:inline">
            {eventCount.toLocaleString()} events
          </span>
          <Link
            href="/subscribe"
            className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium transition hover:bg-blue-500"
          >
            Subscribe {PRICE_MONTHLY}/mo
          </Link>
        </div>
      </div>
    </nav>
  );
}
