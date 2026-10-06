/**
 * The one-time token the website gives a signed-in person to start a session on a banking host.
 *
 * Signed by the website (ES256) and addressed to one audience; lives 60 seconds; carries a unique `jti` that the
 * receiving service must record and refuse a second time (this package verifies, it does not store).
 * The roles inside are information, not authority: the receiver decides what to grant.
 */
import { createRemoteJWKSet, errors, jwtVerify, type CryptoKey, type JWTVerifyGetKey, type KeyObject } from "jose";

export const HANDOFF_USE = "handoff";
export const HANDOFF_TTL_SECONDS = 60;
/** Tokens signed with a longer life are refused even when the signature is good. */
export const MAX_LIFETIME_SECONDS = 120;

export type HandoffConfig = { jwksUrl: string; issuer: string; audiences: string[] };
export type HandoffClaims = {
  personId: string; jti: string; expiresAt: Date; name: string; email: string; roles: string[];
};
export type HandoffErrorCode = "invalid" | "unavailable";

export class HandoffError extends Error {
  constructor(public readonly code: HandoffErrorCode, message: string) {
    super(message);
    this.name = "HandoffError";
  }
}

export function readHandoffConfig(env: Record<string, string | undefined>): HandoffConfig | null {
  const jwksUrl = env.PLATFORM_JWKS_URL?.trim();
  const issuer = env.PLATFORM_ISSUER?.trim().replace(/\/+$/, "");
  if (!jwksUrl || !issuer) return null;
  // Keys must come over TLS in production, or whoever sits on the path could swap them.
  if (env.NODE_ENV === "production" && !/^https:\/\//i.test(jwksUrl)) return null;
  const audiences = (env.SSO_AUDIENCES ?? "banking,app").split(",").map((s) => s.trim()).filter(Boolean);
  return { jwksUrl, issuer, audiences };
}

const keySets = new Map<string, JWTVerifyGetKey>();
export function remoteKeys(url: string): JWTVerifyGetKey {
  let set = keySets.get(url);
  if (!set) {
    set = createRemoteJWKSet(new URL(url), { cooldownDuration: 30_000, cacheMaxAge: 300_000, timeoutDuration: 4_000 });
    keySets.set(url, set);
  }
  return set;
}

const invalid = () => new HandoffError("invalid", "This sign-in link is not valid or has expired.");

export async function verifyHandoff(
  token: string,
  cfg: Pick<HandoffConfig, "issuer" | "audiences">,
  keys: JWTVerifyGetKey | CryptoKey | KeyObject,
  now?: Date,
): Promise<HandoffClaims> {
  const options = {
    issuer: cfg.issuer, audience: cfg.audiences, algorithms: ["ES256"], clockTolerance: 5, currentDate: now,
    requiredClaims: ["exp", "iat", "jti", "sub", "aud", "iss"],
  };
  let payload;
  try {
    ({ payload } = typeof keys === "function" ? await jwtVerify(token, keys, options) : await jwtVerify(token, keys, options));
  } catch (e) {
    if (e instanceof errors.JWKSTimeout) throw new HandoffError("unavailable", "Key service did not answer.");
    throw invalid();
  }
  const { sub, jti, exp, iat, roles } = payload;
  if (
    payload.use !== HANDOFF_USE || typeof sub !== "string" || !sub || sub.length > 64 ||
    typeof jti !== "string" || !jti || jti.length > 100 || typeof exp !== "number" || typeof iat !== "number" ||
    exp - iat > MAX_LIFETIME_SECONDS || !Array.isArray(roles) || !roles.every((r) => typeof r === "string")
  ) throw invalid();
  return {
    personId: sub, jti, expiresAt: new Date(exp * 1000),
    name: typeof payload.name === "string" ? payload.name.trim() : "",
    email: typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "",
    roles: roles as string[],
  };
}
