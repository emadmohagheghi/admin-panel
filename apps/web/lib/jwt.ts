// Minimal JWT payload reader for the edge auth gate.
//
// The signature is NOT verified here — this is a UX gate that routes
// obviously-dead sessions to /login before any page or API request is made.
// Real authorization is always enforced by the backend on every request;
// a forged token may at most render an empty dashboard shell that fails
// to load any data.
//
// Edge-safe on purpose: only Web APIs (atob), no Node modules.

type JwtPayload = { exp?: number; [key: string]: unknown }

function decodeJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split(".")
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const parsed: unknown = JSON.parse(atob(padded))
    if (typeof parsed !== "object" || parsed === null) return null
    return parsed as JwtPayload
  } catch {
    return null
  }
}

/**
 * True only when the token is present, decodes, and its exp is verifiably in
 * the past. Undecodable tokens deliberately count as NOT expired — an unknown
 * format must fall back to the old presence semantics instead of locking
 * users out; the backend still rejects anything actually invalid.
 */
export function isTokenExpired(token: string | null | undefined, now: number = Date.now()): boolean {
  if (!token) return false
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 < now
}
