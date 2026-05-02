"use client";

import { useState } from "react";
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
      if (data.url) window.location.href = data.url;
      else setError(data.error || "Something went wrong");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="rounded-lg border p-7" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Subscribe</h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            $2.99/month. 9 Google Calendar feeds, auto-updated weekly. Cancel anytime.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your Google account email"
              className="w-full rounded-md border px-3.5 py-2.5 text-[13px] outline-none transition focus:ring-1 focus:ring-blue-500/30"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            {error && <p className="text-[12px] text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#111827] py-2.5 text-[13px] font-medium text-white transition disabled:opacity-40 dark:bg-white dark:text-[#111827]"
            >
              {loading ? "Redirecting..." : "Subscribe -- $2.99/mo"}
            </button>
          </form>
          <p className="mt-3 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
            Powered by Stripe. Payment info never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
