// Server-only helpers for talking to the Django backend. Shared by the
// GraphQL proxy (app/api/graphql) and the media proxy (app/api/media).
// Never import from client components — this pulls the undici Agent into
// the bundle, which has no meaning in the browser.
import { Agent, fetch as undiciFetch } from "undici"

export const BACKEND_URL = process.env.GRAPHQL_BACKEND_ENDPOINT ?? ""

export const BACKEND_ORIGIN = (() => {
  try {
    return new URL(BACKEND_URL).origin
  } catch {
    return ""
  }
})()

/**
 * TEMPORARY: the backend currently runs on https://193.228.90.241:7777 with a
 * self-signed certificate, which fetch rejects by default. While that cert is
 * in place, requests go through an undici Agent with TLS verification
 * disabled — scoped to ONLY the backend fetches made through backendFetch.
 *
 * Scope of the bypass:
 * - development: always on (no trusted cert locally either).
 * - production: only when GRAPHQL_ALLOW_INSECURE_TLS is explicitly set, so
 *   deploys can work before the backend gets a trusted certificate. This
 *   leaves Vercel→backend traffic open to MITM; it must be turned off (env
 *   removed) and this agent deleted once the backend has a trusted cert.
 * The bypass deliberately avoids NODE_TLS_REJECT_UNAUTHORIZED, which would
 * silently weaken TLS for every connection in the process.
 */
export const allowInsecureTls = ["1", "true"].includes(
  (process.env.GRAPHQL_ALLOW_INSECURE_TLS ?? "").trim().toLowerCase(),
)

export const relaxedTlsAgent =
  process.env.NODE_ENV === "development" || allowInsecureTls
    ? new Agent({ connect: { rejectUnauthorized: false } })
    : undefined

/**
 * Backend fetch helper. When TLS verification is relaxed (development, or
 * production with GRAPHQL_ALLOW_INSECURE_TLS) it must use undici's own fetch:
 * Node's global fetch accepts a `dispatcher` option only from its bundled
 * internal undici and throws UND_ERR_INVALID_ARG for a third-party Agent
 * (verified: "global fetch + dispatcher → UND_ERR_INVALID_ARG", while
 * "undici.fetch + dispatcher → 200"). undici's fetch performs no HTTP
 * caching, so the cache option is dropped there; otherwise the global fetch
 * with `cache: "no-store"` and full TLS verification is kept.
 */
export async function backendFetch(url: string, init: RequestInit): Promise<Response> {
  if (!relaxedTlsAgent) return fetch(url, init)
  // undici fetch performs no HTTP caching — drop the cache option.
  const rest: RequestInit = { ...init }
  delete (rest as { cache?: unknown }).cache
  // undici's RequestInit type differs slightly from the global one (body
  // stream identity), so bridge through unknown — runtime shape is compatible.
  return undiciFetch(
    url,
    { ...rest, dispatcher: relaxedTlsAgent } as unknown as Parameters<typeof undiciFetch>[1],
  ) as unknown as Response
}
