// Same-origin proxy for the backend's Django GraphQL endpoint.
//
// Security guarantees of this handler:
// 1) The destination URL comes only from env (GRAPHQL_BACKEND_ENDPOINT) — no
//    client input is used in URL construction; a single fixed path is proxied.
// 2) Client request headers are never copied; only the required headers are
//    built server-side: Content-Type / Accept / X-CSRFToken / Referer / Cookie
//    (whitelisted cookies only).
// 3) Cookies forwarded to the backend are whitelisted (csrftoken + session
//    cookies defined via SESSION_COOKIE_NAME/SESSION_COOKIE_NAMES) so unrelated
//    domain cookies never leak outward.
// 4) Backend Set-Cookie headers have their Domain attribute stripped before
//    being forwarded so the browser accepts them for our own domain.
// 5) The response handed to the browser is ALWAYS a JSON body: urql
//    JSON-parses anything whose content-type is not text/*, so backend HTML
//    error pages or truncated bodies would surface to the user as an opaque
//    "Unexpected end of JSON input". Non-JSON upstream responses are wrapped
//    into a GraphQL errors payload with a readable message instead.
//
// Why a Route Handler instead of rewrites? Django rejects foreign Referer
// headers on HTTPS (verified: POST with a localhost Referer → 403 CSRF check).
import { NextRequest, NextResponse } from "next/server"

import { BACKEND_URL, backendFetch } from "@/lib/backend"

/** Session cookie name for the proxy.ts gate (Django default) */
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "access"
/** Extra allowed cookie names (e.g. refresh token) — confirm after real login */
const EXTRA_ALLOWED_COOKIES = (process.env.SESSION_COOKIE_NAMES ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean)

/** Only these cookies are sent to the backend */
const ALLOWED_COOKIE_NAMES = new Set(["csrftoken", SESSION_COOKIE_NAME, ...EXTRA_ALLOWED_COOKIES])

/** Read a single cookie value from a Cookie header */
function readCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

/** Build the backend Cookie header only from whitelisted cookies */
function buildBackendCookieHeader(browserCookieHeader: string): string {
  return browserCookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      const name = part.split("=")[0]?.trim()
      return !!name && ALLOWED_COOKIE_NAMES.has(name)
    })
    .join("; ")
}

/** Extract Set-Cookie headers — covers older Headers typings */
function getSetCookies(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] }
  if (typeof h.getSetCookie === "function") return h.getSetCookie()
  const single = headers.get("set-cookie")
  return single ? [single] : []
}

function extractCsrfToken(setCookies: string[]): string | null {
  for (const c of setCookies) {
    const m = /csrftoken=([^;]+)/.exec(c)
    if (m) return m[1] ?? null
  }
  return null
}

/**
 * Strip the Domain attribute from a backend Set-Cookie.
 * A cookie scoped to another domain is rejected by the browser; removing the
 * attribute makes it host-only for our own domain so it is sent back later.
 */
function sanitizeSetCookie(cookie: string): string {
  return cookie
    .split(/;\s*/)
    .filter((attr) => !/^domain=/i.test(attr))
    .join("; ")
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ errors: [{ message }] }, { status })
}

/** Flatten `fetch failed` + its `cause` chain so prod logs/UI show the real reason. */
function describeFetchError(err: unknown): string {
  if (!(err instanceof Error)) return "unknown error"
  const parts = [err.message]
  let cause: unknown = (err as { cause?: unknown }).cause
  while (cause instanceof Error && parts.length < 4) {
    parts.push(cause.message)
    cause = (cause as { cause?: unknown }).cause
  }
  return parts.join(" ← ")
}

function ensureConfigured(): NextResponse | null {
  if (!BACKEND_URL) return jsonError("GRAPHQL_BACKEND_ENDPOINT is not configured", 500)
  return null
}

/**
 * Fetch a fresh csrftoken from the backend (GET the GraphiQL page).
 * Used to bootstrap the CSRF session when the browser has no cookie yet.
 */
async function fetchFreshCsrfToken(): Promise<string | null> {
  const res = await backendFetch(BACKEND_URL, {
    headers: { Accept: "text/html" },
    cache: "no-store",
  })
  if (!res.ok) return null
  return extractCsrfToken(getSetCookies(res.headers))
}

/**
 * GET: fetch the backend csrftoken and set it on our domain.
 * The client calls this once before the first POST.
 * Note: our GraphQL client (preferGetMethod: false) never sends GraphQL over
 * GET; if a GET-with-query arrives the client is misconfigured — respond with
 * a clear error instead of a confusing empty body.
 */
export async function GET(request: NextRequest) {
  const notConfigured = ensureConfigured()
  if (notConfigured) return notConfigured

  if (request.nextUrl.searchParams.has("query")) {
    return NextResponse.json(
      {
        errors: [
          { message: "GraphQL over GET is not supported; the client must use preferGetMethod: false" },
        ],
      },
      { status: 405 },
    )
  }

  try {
    const csrf = await fetchFreshCsrfToken()
    if (!csrf) return jsonError("Failed to fetch csrftoken", 502)

    const res = NextResponse.json({ ok: true })
    res.cookies.set("csrftoken", csrf, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    })
    return res
  } catch (err) {
    console.error("GraphQL proxy GET failed:", describeFetchError(err))
    return jsonError(`Backend unreachable: ${describeFetchError(err)}`, 502)
  }
}

/**
 * Forward the JSON payload to the backend with full CSRF handling.
 * `csrfOverride` supplies a freshly bootstrapped token (stale-token retry).
 */
async function forwardPost(
  browserCookieHeader: string,
  payload: string,
  csrfOverride?: string,
): Promise<Response> {
  let csrf = csrfOverride ?? readCookie(browserCookieHeader, "csrftoken")
  // Drop the browser's csrftoken from the forwarded cookies — the token in
  // the X-CSRFToken header below is the authoritative one, and Django's
  // double-submit check fails if a stale cookie value doesn't match it.
  const backendCookieHeader = buildBackendCookieHeader(browserCookieHeader)
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !/^csrftoken=/i.test(part))
    .join("; ")

  // If neither the browser nor the caller provided a token, bootstrap one
  if (!csrf) {
    csrf = await fetchFreshCsrfToken()
    if (!csrf) throw new Error("Failed to fetch csrftoken")
  }
  const cookieWithCsrf = backendCookieHeader
    ? `${backendCookieHeader}; csrftoken=${csrf}`
    : `csrftoken=${csrf}`

  return backendFetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRFToken": csrf,
      // Referer must match the backend URL: Django's CSRF check on HTTPS
      // rejects foreign Referer headers.
      Referer: BACKEND_URL,
      Cookie: cookieWithCsrf,
    },
    body: payload,
    cache: "no-store",
  })
}

/**
 * Convert the backend response into what the browser should receive:
 * a non-empty JSON body passes through untouched; anything else (HTML error
 * pages, empty bodies, non-JSON content) becomes a valid GraphQL errors
 * payload so the client always shows a readable message. Backend Set-Cookies
 * (session/rotation) are still forwarded with the Domain attribute stripped.
 */
async function buildProxyResponse(backendRes: Response): Promise<NextResponse> {
  const rawBody = await backendRes.text()
  const contentType = backendRes.headers.get("content-type") ?? ""
  const isJsonBody = /application\/json/i.test(contentType) && rawBody.trim() !== ""

  const res = new NextResponse(
    isJsonBody
      ? rawBody
      : JSON.stringify({
          errors: [
            {
              message: `Backend returned a non-JSON response (${backendRes.status} ${
                backendRes.statusText || contentType || "empty body"
              })`,
            },
          ],
        }),
    {
      status: backendRes.status,
      headers: { "Content-Type": "application/json" },
    },
  )

  for (const cookie of getSetCookies(backendRes.headers)) {
    res.headers.append("set-cookie", sanitizeSetCookie(cookie))
  }
  return res
}

/**
 * POST: forward the query/mutation to the backend.
 * A stale browser csrftoken makes Django answer 403 with an HTML page (and a
 * rotated token); in that case bootstrap a fresh token server-side and retry
 * once before giving up, so expiring cookies heal themselves silently.
 */
export async function POST(request: NextRequest) {
  const notConfigured = ensureConfigured()
  if (notConfigured) return notConfigured

  // Only JSON GraphQL payloads are proxied
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return jsonError("Only Content-Type: application/json is accepted", 415)
  }

  const payload = await request.text()
  const browserCookieHeader = request.headers.get("cookie") ?? ""

  try {
    let backendRes = await forwardPost(browserCookieHeader, payload)
    if (
      backendRes.status === 403 &&
      /text\/html/i.test(backendRes.headers.get("content-type") ?? "")
    ) {
      const fresh = await fetchFreshCsrfToken()
      if (fresh) backendRes = await forwardPost(browserCookieHeader, payload, fresh)
    }
    return await buildProxyResponse(backendRes)
  } catch (err) {
    console.error("GraphQL proxy POST failed:", describeFetchError(err))
    return jsonError(`Backend unreachable: ${describeFetchError(err)}`, 502)
  }
}
