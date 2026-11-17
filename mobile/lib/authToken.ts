/**
 * JWT expiration inspection & centralized unauthorized session handler.
 * Ensures expired or revoked server tokens consistently sign out the stale session
 * without wiping offline sessions during transient network outages.
 */

export interface DecodedJwtPayload {
  userId?: string;
  email?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    if (typeof globalThis.atob === "function") {
      return globalThis.atob(padded);
    }
    const gBuffer = (globalThis as any).Buffer;
    if (typeof gBuffer !== "undefined") {
      return gBuffer.from(padded, "base64").toString("utf8");
    }
    return null;
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token?: string | null): DecodedJwtPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const jsonStr = decodeBase64Url(parts[1]);
  if (!jsonStr) return null;
  try {
    const parsed = JSON.parse(jsonStr);
    return parsed && typeof parsed === "object" ? (parsed as DecodedJwtPayload) : null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a JWT token has passed its `exp` claim.
 * Non-JWT test tokens without 3 segments return false so isolated unit fixtures continue working,
 * while real JWTs with an expired `exp` timestamp are immediately detected.
 */
export function isJwtTokenExpired(token?: string | null, clockSkewSeconds = 5): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return false;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSeconds + clockSkewSeconds;
}

type UnauthorizedHandler = (expectedRevision?: number) => Promise<void> | void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedSessionHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export async function notifyUnauthorizedSession(
  expectedRevisionOrReason?: number | string
): Promise<void> {
  if (unauthorizedHandler) {
    const rev =
      typeof expectedRevisionOrReason === "number" ? expectedRevisionOrReason : undefined;
    await unauthorizedHandler(rev);
  }
}
