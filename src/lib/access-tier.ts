import type { Subscriber } from "./types";

export type AccessTier = "free" | "trial" | "subscriber";

export const TRIAL_DAYS = 10;

type TierInput = Pick<Subscriber, "status" | "trial_ends_at"> | null | undefined;

/**
 * Access tier is COMPUTED, never stored:
 *  - "subscriber": active Stripe subscription (past_due gets a 24h grace window
 *    via the webhook leaving status untouched until Stripe retries fail)
 *  - "trial": no active subscription, but trial_ends_at is in the future
 *  - "free": everything else (no row, expired trial, canceled sub)
 */
export function getAccessTier(subscriber: TierInput): AccessTier {
  if (!subscriber) return "free";
  if (subscriber.status === "active") return "subscriber";
  if (subscriber.trial_ends_at && new Date(subscriber.trial_ends_at) > new Date()) {
    return "trial";
  }
  return "free";
}

export function hasFullAccess(tier: AccessTier): boolean {
  return tier === "trial" || tier === "subscriber";
}

export function trialDaysLeft(subscriber: TierInput): number {
  if (!subscriber?.trial_ends_at) return 0;
  const ms = new Date(subscriber.trial_ends_at).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
}

/** True if this email has ever had a trial (used or in progress). */
export function trialAlreadyUsed(subscriber: TierInput & { trial_started_at?: string | null } | null | undefined): boolean {
  return Boolean(subscriber?.trial_started_at);
}
