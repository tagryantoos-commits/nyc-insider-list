"use client";

import { useState } from "react";
import { X, Calendar, Star, Zap, Check } from "lucide-react";
import type { Event } from "@/lib/types";
import CalendarPreview from "./CalendarPreview";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
  gatedEventCount: number;
  subscriberCount?: number;
  /** Called after a trial starts or resumes so the page can refresh access state. */
  onUnlocked?: () => void;
}

export default function SubscribeModal({
  isOpen,
  onClose,
  events,
  gatedEventCount,
  subscriberCount = 0,
  onUnlocked,
}: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [trialStarted, setTrialStarted] = useState(false);
  const [trialUsedUp, setTrialUsedUp] = useState(false);

  if (!isOpen) return null;

  async function handleStartTrial(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      if (data.tier === "trial" || data.tier === "subscriber") {
        setTrialStarted(true);
        onUnlocked?.();
      } else if (data.trialAlreadyUsed) {
        // Trial expired for this email — steer to the paid tier
        setTrialUsedUp(true);
        onUnlocked?.();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!email.trim()) {
      setError("Enter your email above first.");
      return;
    }
    setCheckoutLoading(true);
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
      setCheckoutLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-xl border"
        style={{ background: "#141418", borderColor: "rgba(255,255,255,0.08)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-md transition hover:bg-[rgba(255,255,255,0.05)]"
          style={{ color: "var(--text-muted)" }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>

        <div style={{ padding: "28px 24px" }}>
          {trialStarted ? (
            /* Success state */
            <div className="text-center" style={{ padding: "24px 0" }}>
              <div
                className="mx-auto flex items-center justify-center rounded-full"
                style={{ width: 52, height: 52, background: "rgba(34,197,94,0.15)" }}
              >
                <Check style={{ width: 28, height: 28, color: "#22c55e" }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginTop: 16 }}>
                You&apos;re in!
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
                Every event is unlocked for the next 10 days. No card, no catch.
              </p>
              <button
                onClick={onClose}
                className="mt-6 rounded-md transition hover:opacity-90"
                style={{
                  padding: "12px 28px",
                  background: "var(--gold)",
                  color: "#0a0a0f",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Start exploring
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                {trialUsedUp
                  ? "Your free trial has ended"
                  : gatedEventCount > 0
                    ? `Unlock all ${gatedEventCount}+ events — free`
                    : "Unlock every NYC event — free"}
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6 }}>
                {trialUsedUp
                  ? "Keep every NYC event unlocked, plus calendar sync, for less than a subway ride."
                  : "10 days of full access. No credit card required."}
              </p>

              {/* Value props */}
              <div className="flex flex-col gap-3 mt-5">
                <div className="flex items-start gap-3">
                  <Zap style={{ width: 18, height: 18, color: "var(--gold)", marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Every event, unlocked</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Full details, dates, venues, and prices for everything happening in NYC</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star style={{ width: 18, height: 18, color: "var(--gold)", marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Insider Picks included</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Our curated top picks each week — the stuff actually worth going to</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar style={{ width: 18, height: 18, color: "var(--gold)", marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Calendar sync for subscribers</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Upgrade for 10 category calendars that update themselves weekly</p>
                  </div>
                </div>
              </div>

              {/* Calendar preview */}
              <div className="mt-6">
                <CalendarPreview events={events} />
              </div>

              {/* Trial form (primary) or checkout push (trial used up) */}
              <form onSubmit={handleStartTrial} className="mt-6">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full rounded-md border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[rgba(255,255,255,0.15)]"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
                {/* Honeypot — hidden from real users */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
                />
                {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
                {!trialUsedUp && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-3 rounded-md transition disabled:opacity-40 hover:opacity-90"
                    style={{
                      height: 44,
                      background: "var(--gold)",
                      color: "#0a0a0f",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {loading ? "Starting your trial..." : "Start free 10-day trial"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className={
                    trialUsedUp
                      ? "w-full mt-3 rounded-md transition disabled:opacity-40 hover:opacity-90"
                      : "w-full mt-2 rounded-md border transition disabled:opacity-40 hover:opacity-80"
                  }
                  style={
                    trialUsedUp
                      ? { height: 44, background: "var(--gold)", color: "#0a0a0f", fontSize: 14, fontWeight: 700 }
                      : { height: 40, borderColor: "var(--border)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, background: "transparent" }
                  }
                >
                  {checkoutLoading
                    ? "Redirecting to checkout..."
                    : trialUsedUp
                      ? "Subscribe — $2.99/mo"
                      : "Or subscribe now — $2.99/mo with calendar sync"}
                </button>
              </form>

              {/* Social proof + fine print */}
              <div className="mt-4 text-center">
                {subscriberCount > 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                    Join {subscriberCount}+ subscribers
                  </p>
                )}
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {trialUsedUp
                    ? "Cancel anytime. Powered by Stripe."
                    : "No credit card required. Cancel anytime."}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
