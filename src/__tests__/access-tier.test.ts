import {
  getAccessTier,
  hasFullAccess,
  trialDaysLeft,
  trialAlreadyUsed,
  TRIAL_DAYS,
} from "@/lib/access-tier";
import { isValidEmail, isDisposableEmail, normalizeEmail } from "@/lib/trial";
import { createSessionToken, verifySessionToken } from "@/lib/session";

const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

type Sub = Parameters<typeof getAccessTier>[0];
const sub = (overrides: Partial<NonNullable<Sub>> = {}): Sub => ({
  status: "inactive",
  trial_ends_at: null,
  ...overrides,
});

describe("getAccessTier", () => {
  test("no subscriber row → free", () => {
    expect(getAccessTier(null)).toBe("free");
    expect(getAccessTier(undefined)).toBe("free");
  });

  test("active Stripe subscription → subscriber", () => {
    expect(getAccessTier(sub({ status: "active" }))).toBe("subscriber");
  });

  test("active subscription outranks a running trial", () => {
    expect(getAccessTier(sub({ status: "active", trial_ends_at: daysFromNow(5) }))).toBe("subscriber");
  });

  test("running trial → trial", () => {
    expect(getAccessTier(sub({ trial_ends_at: daysFromNow(5) }))).toBe("trial");
  });

  test("expired trial → free", () => {
    expect(getAccessTier(sub({ trial_ends_at: daysFromNow(-1) }))).toBe("free");
  });

  test("canceled subscription with expired trial → free", () => {
    expect(getAccessTier(sub({ status: "canceled", trial_ends_at: daysFromNow(-30) }))).toBe("free");
  });

  test("past_due is not full access", () => {
    expect(getAccessTier(sub({ status: "past_due" }))).toBe("free");
  });
});

describe("hasFullAccess", () => {
  test("trial and subscriber have access, free does not", () => {
    expect(hasFullAccess("trial")).toBe(true);
    expect(hasFullAccess("subscriber")).toBe(true);
    expect(hasFullAccess("free")).toBe(false);
  });
});

describe("trialDaysLeft", () => {
  test("rounds up partial days", () => {
    expect(trialDaysLeft(sub({ trial_ends_at: daysFromNow(0.5) }))).toBe(1);
  });

  test("full trial window", () => {
    expect(trialDaysLeft(sub({ trial_ends_at: daysFromNow(TRIAL_DAYS) }))).toBe(TRIAL_DAYS);
  });

  test("expired → 0, never negative", () => {
    expect(trialDaysLeft(sub({ trial_ends_at: daysFromNow(-3) }))).toBe(0);
  });

  test("no trial → 0", () => {
    expect(trialDaysLeft(null)).toBe(0);
    expect(trialDaysLeft(sub())).toBe(0);
  });
});

describe("trialAlreadyUsed", () => {
  test("set trial_started_at means used", () => {
    expect(trialAlreadyUsed({ ...sub()!, trial_started_at: daysFromNow(-2) })).toBe(true);
    expect(trialAlreadyUsed({ ...sub()!, trial_started_at: null })).toBe(false);
    expect(trialAlreadyUsed(null)).toBe(false);
  });
});

describe("email validation", () => {
  test("accepts normal emails", () => {
    expect(isValidEmail("ryan@example.com")).toBe(true);
    expect(isValidEmail("a.b+c@sub.domain.co")).toBe(true);
  });

  test("rejects malformed emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });

  test("flags disposable domains and TLDs", () => {
    expect(isDisposableEmail("x@mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@yopmail.com")).toBe(true);
    expect(isDisposableEmail("x@something.tk")).toBe(true);
    expect(isDisposableEmail("x@gmail.com")).toBe(false);
  });

  test("normalizes case and whitespace", () => {
    expect(normalizeEmail("  Ryan@Example.COM ")).toBe("ryan@example.com");
  });
});

describe("session tokens", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = "test-secret-for-jest-only";
  });

  test("round-trips an email", () => {
    const token = createSessionToken("ryan@example.com");
    expect(verifySessionToken(token)).toBe("ryan@example.com");
  });

  test("lowercases the email", () => {
    const token = createSessionToken("Ryan@Example.com");
    expect(verifySessionToken(token)).toBe("ryan@example.com");
  });

  test("rejects tampered tokens", () => {
    const token = createSessionToken("ryan@example.com");
    const [payload, exp] = token.split(".");
    expect(verifySessionToken(`${payload}.${exp}.forged-signature`)).toBeNull();
    const other = Buffer.from("evil@example.com").toString("base64url");
    expect(verifySessionToken(`${other}.${exp}.${token.split(".")[2]}`)).toBeNull();
  });

  test("rejects expired tokens", () => {
    const token = createSessionToken("ryan@example.com", -1);
    expect(verifySessionToken(token)).toBeNull();
  });

  test("rejects garbage", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("a.b")).toBeNull();
    expect(verifySessionToken("a.b.c.d")).toBeNull();
  });
});
