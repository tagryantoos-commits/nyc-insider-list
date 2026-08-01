"use client";

import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

export default function SubscribePage() {
  const [trialEmail, setTrialEmail] = useState("");
  const [paidEmail, setPaidEmail] = useState("");
  const [trialLoading, setTrialLoading] = useState(false);
  const [paidLoading, setPaidLoading] = useState(false);
  const [trialError, setTrialError] = useState("");
  const [paidError, setPaidError] = useState("");
  const [trialStarted, setTrialStarted] = useState(false);
  const [trialUsedUp, setTrialUsedUp] = useState(false);

  async function handleStartTrial(e: React.FormEvent) {
    e.preventDefault();
    if (!trialEmail.trim()) return;
    setTrialLoading(true);
    setTrialError("");
    try {
      const res = await fetch("/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trialEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTrialError(data.error || "Something went wrong");
        return;
      }
      if (data.tier === "trial" || data.tier === "subscriber") {
        setTrialStarted(true);
      } else if (data.trialAlreadyUsed) {
        setTrialUsedUp(true);
        setPaidEmail(trialEmail);
      }
    } catch {
      setTrialError("Network error. Please try again.");
    } finally {
      setTrialLoading(false);
    }
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!paidEmail.trim()) return;
    setPaidLoading(true);
    setPaidError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: paidEmail }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPaidError(data.error || "Something went wrong");
    } catch {
      setPaidError("Network error. Please try again.");
    } finally {
      setPaidLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        {/* Free trial — primary card */}
        <div
          className="rounded-lg border p-7"
          style={{ background: "var(--bg-card)", borderColor: "rgba(240,200,64,0.35)" }}
        >
          {trialStarted ? (
            <div className="text-center py-4">
              <div
                className="mx-auto flex items-center justify-center rounded-full"
                style={{ width: 44, height: 44, background: "rgba(34,197,94,0.15)" }}
              >
                <Check style={{ width: 24, height: 24, color: "#22c55e" }} />
              </div>
              <h1 className="mt-4 text-lg font-semibold" style={{ color: "var(--text)" }}>
                You&apos;re in!
              </h1>
              <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                Every event is unlocked for 10 days.
              </p>
              <Link
                href="/events"
                className="mt-5 inline-block rounded-md px-6 py-2.5 text-[13px] font-bold"
                style={{ background: "var(--gold)", color: "#0a0a0f" }}
              >
                Browse events
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                Start your free trial
              </h1>
              <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                10 days of full access to every NYC event. No credit card required.
              </p>

              <form onSubmit={handleStartTrial} className="mt-5 space-y-3">
                <input
                  type="email"
                  required
                  value={trialEmail}
                  onChange={(e) => setTrialEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full rounded-md border px-3.5 py-2.5 text-[13px] outline-none transition focus:ring-1 focus:ring-yellow-500/30"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
                {trialError && <p className="text-[12px] text-red-500">{trialError}</p>}
                {trialUsedUp && (
                  <p className="text-[12px]" style={{ color: "var(--gold)" }}>
                    This email&apos;s free trial has ended — subscribe below to keep full access.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={trialLoading}
                  className="w-full rounded-md py-2.5 text-[13px] font-bold transition disabled:opacity-40 hover:opacity-90"
                  style={{ background: "var(--gold)", color: "#0a0a0f" }}
                >
                  {trialLoading ? "Starting..." : "Start free 10-day trial"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Paid — secondary card */}
        <div className="mt-4 rounded-lg border p-7" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
            Subscribe — $2.99/month
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Full access that never expires, plus 10 category calendars that auto-sync
            to your Google Calendar weekly. Cancel anytime.
          </p>

          <form onSubmit={handleCheckout} className="mt-5 space-y-3">
            <input
              type="email"
              required
              value={paidEmail}
              onChange={(e) => setPaidEmail(e.target.value)}
              placeholder="Your Google account email"
              className="w-full rounded-md border px-3.5 py-2.5 text-[13px] outline-none transition focus:ring-1 focus:ring-blue-500/30"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            {paidError && <p className="text-[12px] text-red-500">{paidError}</p>}
            <button
              type="submit"
              disabled={paidLoading}
              className="w-full rounded-md border py-2.5 text-[13px] font-medium transition disabled:opacity-40 hover:opacity-80"
              style={{ borderColor: "var(--border)", color: "var(--text)", background: "transparent" }}
            >
              {paidLoading ? "Redirecting..." : "Subscribe — $2.99/mo"}
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
