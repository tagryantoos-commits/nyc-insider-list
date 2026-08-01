import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "nyc_session";
const SESSION_DAYS = 30;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Token format: base64url(email).expiresAtMs.signature */
export function createSessionToken(email: string, days = SESSION_DAYS): string {
  const encoded = Buffer.from(email.toLowerCase()).toString("base64url");
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
  const payload = `${encoded}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns the email if the token is valid and unexpired, else null. */
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encoded, expiresAt, signature] = parts;
  const payload = `${encoded}.${expiresAt}`;
  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  if (Number(expiresAt) < Date.now()) return null;
  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function getSessionEmail(request: NextRequest): string | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(response: NextResponse, email: string): void {
  response.cookies.set(SESSION_COOKIE, createSessionToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}
