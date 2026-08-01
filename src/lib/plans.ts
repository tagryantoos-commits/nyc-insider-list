/** Shared-plan helpers: slug generation + input validation. */

// Lowercase alphanumerics minus ambiguous chars (0/o, 1/l/i)
const SLUG_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
export const SLUG_LENGTH = 6;
export const MAX_PLAN_EVENTS = 30;
export const MAX_TITLE_LENGTH = 80;
export const MAX_NOTE_LENGTH = 500;
export const MAX_RSVP_NAME_LENGTH = 40;

export function generatePlanSlug(): string {
  let slug = "";
  const bytes = new Uint8Array(SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < SLUG_LENGTH; i++) {
    slug += SLUG_CHARS[bytes[i] % SLUG_CHARS.length];
  }
  return slug;
}

export function isValidSlug(slug: string): boolean {
  return new RegExp(`^[${SLUG_CHARS}]{${SLUG_LENGTH}}$`).test(slug);
}

export const RSVP_RESPONSES = ["in", "maybe", "out"] as const;
export type RsvpResponse = (typeof RSVP_RESPONSES)[number];

export function isValidRsvpResponse(value: unknown): value is RsvpResponse {
  return typeof value === "string" && (RSVP_RESPONSES as readonly string[]).includes(value);
}

export interface SharedPlan {
  id: string;
  creator_email: string | null;
  title: string;
  note: string | null;
  event_ids: string[];
  view_count: number;
  created_at: string;
  expires_at: string;
}

export interface PlanRsvp {
  id: string;
  plan_id: string;
  name: string;
  response: RsvpResponse;
  created_at: string;
}

export function isPlanExpired(plan: Pick<SharedPlan, "expires_at">): boolean {
  return new Date(plan.expires_at) < new Date();
}
