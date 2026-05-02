"use client";

import { useState } from "react";
import { CATEGORIES, PRICE_MONTHLY, SITE_NAME } from "@/lib/constants";
import { Calendar, Check, ArrowLeft } from "lucide-react";
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-white/40 transition hover:text-white/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Link>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0f1629] p-8">
          <div className="text-center">
            <Calendar className="mx-auto mb-4 h-10 w-10 text-blue-400" />
            <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold">
              Subscribe to {SITE_NAME}
            </h1>
            <p className="mt-2 text-sm text-white/40">
              {PRICE_MONTHLY}/month &middot; Cancel anytime
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
              What you get
            </h3>
            {[
              "9 Google Calendar feeds, auto-updated weekly",
              "Toggle categories on and off",
              "Rooftop, Broadway, Concerts, Museums, and more",
              "Never miss an event",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-white/60">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your Google account email"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
            />

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Redirecting to checkout..." : `Subscribe — ${PRICE_MONTHLY}/mo`}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-white/20">
            Powered by Stripe. Your payment info is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
