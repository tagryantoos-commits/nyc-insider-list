const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Common disposable-email domains. Not exhaustive — the goal is to deter
// casual trial recycling, not to be bulletproof.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "throwawaymail.com", "yopmail.com", "getnada.com",
  "trashmail.com", "sharklasers.com", "dispostable.com", "maildrop.cc",
  "fakeinbox.com", "mintemail.com", "mytemp.email", "burnermail.io",
  "spamgourmet.com", "mailnesia.com", "tempinbox.com", "emailondeck.com",
]);

const DISPOSABLE_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq"];

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1] ?? "";
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  return DISPOSABLE_TLDS.some((tld) => domain.endsWith(tld));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
