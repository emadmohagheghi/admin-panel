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
 *   leaves server→backend traffic open to MITM; it must be turned off (env
 *   removed) and this agent deleted once the backend has a trusted cert.
 * The bypass deliberately avoids NODE_TLS_REJECT_UNAUTHORIZED, which would
 * silently weaken TLS for every connection in the process.
 */
export const allowInsecureTls = ["1", "true"].includes(
  (process.env.GRAPHQL_ALLOW_INSECURE_TLS ?? "").trim().toLowerCase(),
)

/**
 * Per-attempt TCP connect budget. undici's default is 10s; three attempts at
 * 4s keep the worst case (~13s with backoff) inside the function budget while
 * masking intermittent SYN drops between Vercel egress IPs and the Tehran
 * backend — the observed production failure mode was UND_ERR_CONNECT_TIMEOUT.
 */
const CONNECT_TIMEOUT_MS = 4_000
const BACKEND_FETCH_ATTEMPTS = 3

/** Connect-phase failure codes — the request never left, so retrying is safe. */
const RETRYABLE_CONNECT_CODES = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "ECONNREFUSED",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ETIMEDOUT",
])

/** True when the request failed before anything was written to the socket. */
export function isConnectPhaseError(err: unknown): boolean {
  let cur: unknown = err
  for (let depth = 0; depth < 4 && cur; depth++) {
    const code = (cur as { code?: unknown }).code
    if (typeof code === "string" && RETRYABLE_CONNECT_CODES.has(code)) return true
    const message = (cur as { message?: unknown }).message
    if (typeof message === "string" && /connect timeout/i.test(message)) return true
    cur = (cur as { cause?: unknown }).cause
  }
  return false
}

/** First syscall/undici error code in the `cause` chain, for logs. */
function errorCode(err: unknown): string {
  let cur: unknown = err
  for (let depth = 0; depth < 4 && cur; depth++) {
    const code = (cur as { code?: unknown }).code
    if (typeof code === "string") return code
    cur = (cur as { cause?: unknown }).cause
  }
  return "unknown"
}

/**
 * Flatten `fetch failed` + its `cause` chain (with error codes) so production
 * logs show the real reason, e.g.
 * `fetch failed [UND_ERR_CONNECT_TIMEOUT] ← Connect Timeout Error (...) [...]
 */
export function describeFetchError(err: unknown): string {
  if (!(err instanceof Error)) return "unknown error"
  const parts: string[] = []
  let cur: unknown = err
  for (let depth = 0; depth < 4 && cur instanceof Error; depth++) {
    const code = (cur as { code?: unknown }).code
    parts.push(typeof code === "string" ? `${cur.message} [${code}]` : cur.message)
    cur = (cur as { cause?: unknown }).cause
  }
  return parts.join(" ← ")
}

export const relaxedTlsAgent =
  process.env.NODE_ENV === "development" || allowInsecureTls
    ? new Agent({
        connect: { rejectUnauthorized: false, timeout: CONNECT_TIMEOUT_MS },
      })
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
  for (let attempt = 1; ; attempt++) {
    try {
      return await backendFetchOnce(url, init)
    } catch (err) {
      if (attempt >= BACKEND_FETCH_ATTEMPTS || !isConnectPhaseError(err)) throw err
      // Connect-phase failures happen before the request leaves the machine,
      // so retrying is safe for every method, mutations included. Jittered
      // backoff keeps many warm instances from retrying in lockstep.
      const delay = 200 * 2 ** (attempt - 1) + Math.random() * 150
      console.warn(
        `[backend] connect attempt ${attempt}/${BACKEND_FETCH_ATTEMPTS} failed (${errorCode(err)}); retrying in ${Math.round(delay)}ms`,
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

async function backendFetchOnce(url: string, init: RequestInit): Promise<Response> {
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
