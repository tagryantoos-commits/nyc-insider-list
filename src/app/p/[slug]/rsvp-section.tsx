"use client";

import { useState } from "react";
import type { PlanRsvp, RsvpResponse } from "@/lib/plans";

const RESPONSE_META: Record<RsvpResponse, { label: string; color: string }> = {
  in: { label: "I'm in", color: "#22c55e" },
  maybe: { label: "Maybe", color: "#f0c840" },
  out: { label: "Can't make it", color: "#6b7280" },
};

export default function RsvpSection({
  slug,
  initialRsvps,
}: {
  slug: string;
  initialRsvps: PlanRsvp[];
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<RsvpResponse | null>(null);
  const [rsvps, setRsvps] = useState<Pick<PlanRsvp, "name" | "response">[]>(initialRsvps);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !selected) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/plans/${slug}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, response: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setRsvps(data.rsvps ?? [...rsvps, { name, response: selected }]);
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl border mt-8"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)", padding: "20px" }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Are you in?</h2>

      {submitted ? (
        <p style={{ fontSize: 13, color: "#22c55e", marginTop: 8 }}>
          Got it — you&apos;re on the list.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            className="w-full rounded-md border px-3.5 py-2.5 text-[13px] outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          />
          <div className="flex gap-2 mt-3">
            {(Object.keys(RESPONSE_META) as RsvpResponse[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className="flex-1 rounded-md border py-2.5 transition"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  borderColor: selected === key ? RESPONSE_META[key].color : "var(--border)",
                  color: selected === key ? RESPONSE_META[key].color : "var(--text-secondary)",
                  background: selected === key ? `${RESPONSE_META[key].color}14` : "transparent",
                }}
              >
                {RESPONSE_META[key].label}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim() || !selected}
            className="w-full mt-3 rounded-md transition disabled:opacity-40 hover:opacity-90"
            style={{ height: 42, background: "var(--gold)", color: "#0a0a0f", fontSize: 13, fontWeight: 700 }}
          >
            {loading ? "Sending..." : "Send RSVP"}
          </button>
        </form>
      )}

      {rsvps.length > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Who&apos;s in
          </p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {rsvps.map((r, i) => (
              <span
                key={i}
                className="rounded-full border px-3 py-1"
                style={{
                  fontSize: 12,
                  borderColor: `${RESPONSE_META[r.response].color}40`,
                  color: RESPONSE_META[r.response].color,
                }}
              >
                {r.name} · {RESPONSE_META[r.response].label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
