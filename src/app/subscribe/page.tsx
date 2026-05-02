"use client";

import { useState } from "react";
import { PRICE_MONTHLY } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SubscribePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-[13px] text-[#52525b] transition hover:text-[#71717a]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8">
          <h1 className="text-xl font-semibold text-[#fafafa]">Subscribe</h1>
          <p className="mt-1 text-[13px] text-[#52525b]">
            {PRICE_MONTHLY}/month. 9 Google Calendar feeds, auto-updated weekly.
            Cancel anytime.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your Google account email"
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[14px] text-[#fafafa] placeholder-[#52525b] outline-none transition focus:border-white/[0.15]"
            />

            {error && <p className="text-[13px] text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-white/[0.15] py-2.5 text-[14px] font-medium text-[#fafafa] transition hover:bg-white hover:text-[#09090b] disabled:opacity-40"
            >
              {loading ? "Redirecting..." : `Subscribe -- ${PRICE_MONTHLY}/mo`}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-[#3f3f46]">
            Powered by Stripe. Payment info never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
