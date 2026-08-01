"use client";

import { Clock } from "lucide-react";
import type { AccessState } from "@/hooks/useAccess";

/**
 * Thin status strip under the navbar:
 *  - active trial → days remaining + upgrade link
 *  - expired trial → upgrade prompt
 *  - anon / paid → renders nothing
 */
export default function TrialBanner({
  access,
  onUpgradeClick,
}: {
  access: AccessState;
  onUpgradeClick: () => void;
}) {
  if (access.loading || access.tier === "subscriber") return null;

  const expired = access.tier === "free" && access.trialAlreadyUsed && access.email;
  if (access.tier !== "trial" && !expired) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 text-center"
      style={{
        background: expired ? "rgba(239,68,68,0.08)" : "rgba(240,200,64,0.08)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <Clock style={{ width: 13, height: 13, color: expired ? "#ef4444" : "var(--gold)", flexShrink: 0 }} />
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        {expired ? (
          <>Your free trial has ended.</>
        ) : (
          <>
            <span style={{ color: "var(--gold)", fontWeight: 600 }}>
              {access.trialDaysLeft} {access.trialDaysLeft === 1 ? "day" : "days"}
            </span>{" "}
            left in your free trial.
          </>
        )}{" "}
        <button
          onClick={onUpgradeClick}
          className="underline transition hover:opacity-80"
          style={{ color: expired ? "#ef4444" : "var(--gold)", fontWeight: 600 }}
        >
          {expired ? "Subscribe for $2.99/mo" : "Keep it forever — $2.99/mo"}
        </button>
      </p>
    </div>
  );
}
