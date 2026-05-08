"use client";

import { useState } from "react";
import { X, Calendar, Star, Zap } from "lucide-react";
import type { Event } from "@/lib/types";
import CalendarPreview from "./CalendarPreview";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
  gatedEventCount: number;
  subscriberCount?: number;
}

export default function SubscribeModal({
  isOpen,
  onClose,
  events,
  gatedEventCount,
  subscriberCount = 0,
}: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

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
          {/* Header */}
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
            Unlock all {gatedEventCount}+ events
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6 }}>
            Get every NYC event delivered to your Google Calendar, organized by category.
          </p>

          {/* Value props */}
          <div className="flex flex-col gap-3 mt-5">
            <div className="flex items-start gap-3">
              <Calendar style={{ width: 18, height: 18, color: "var(--gold)", marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>10 category calendars</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Rooftop, Broadway, Concerts, Festivals, and more -- each as its own calendar feed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap style={{ width: 18, height: 18, color: "var(--gold)", marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Auto-updated weekly</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>New events appear in your calendar automatically. No manual entry.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Star style={{ width: 18, height: 18, color: "var(--gold)", marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Insider Picks included</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Our curated top picks each week, plus full event details and early access</p>
              </div>
            </div>
          </div>

          {/* Calendar preview */}
          <div className="mt-6">
            <CalendarPreview events={events} />
          </div>

          {/* Checkout form */}
          <form onSubmit={handleSubmit} className="mt-6">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your Google account email"
              className="w-full rounded-md border px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[rgba(255,255,255,0.15)]"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
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
              {loading ? "Redirecting to checkout..." : "Subscribe -- $2.99/mo"}
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
              7-day free trial. Cancel anytime. Powered by Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
