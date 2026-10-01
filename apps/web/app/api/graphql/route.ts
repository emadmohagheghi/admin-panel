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
//
// Why a Route Handler instead of rewrites? Django rejects foreign Referer
// headers on HTTPS (verified: POST with a localhost Referer → 403 CSRF check).
import { NextRequest, NextResponse } from "next/server"
import { Agent } from "undici"

const BACKEND_URL = process.env.GRAPHQL_BACKEND_ENDPOINT ?? ""

/**
 * TEMPORARY (development only): the backend currently runs on
 * https://193.228.90.241:7777 with a self-signed certificate, which Node's
 * fetch rejects by default. While that cert is in place, dev proxy requests
 * go through an undici Agent with TLS verification disabled — scoped to ONLY
 * the two backend fetches in this file via `dispatcher`. This deliberately
 * avoids NODE_TLS_REJECT_UNAUTHORIZED, which would silently weaken TLS for
 * every connection in the process. Production keeps full verification: the
 * agent is not created outside development and must be removed once the
 * backend gets a trusted certificate.
 */
const devTlsAgent =
  process.env.NODE_ENV === "development"
    ? new Agent({ connect: { rejectUnauthorized: false } })
    : undefined

/** Attach the dev-only TLS agent to a backend fetch init (production: unchanged) */
function withDevTlsAgent(init: RequestInit): RequestInit {
  if (!devTlsAgent) return init
  return { ...init, dispatcher: devTlsAgent } as RequestInit
}

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

function ensureConfigured(): NextResponse | null {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { errors: [{ message: "GRAPHQL_BACKEND_ENDPOINT is not configured" }] },
      { status: 500 },
    )
  }
  return null
}

/**
 * Fetch a fresh csrftoken from the backend (GET the GraphiQL page).
 * Used to bootstrap the CSRF session when the browser has no cookie yet.
 */
async function fetchFreshCsrfToken(): Promise<string | null> {
  const res = await fetch(
    BACKEND_URL,
    withDevTlsAgent({
      headers: { Accept: "text/html" },
      cache: "no-store",
    }),
  )
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

  const csrf = await fetchFreshCsrfToken()
  if (!csrf) {
    return NextResponse.json({ errors: [{ message: "Failed to fetch csrftoken" }] }, { status: 502 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set("csrftoken", csrf, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}

/**
 * POST: forward the query/mutation to the backend with full CSRF handling.
 * Whitelisted browser cookies travel to the backend and backend Set-Cookies
 * (session/rotation) come back to the browser.
 */
export async function POST(request: NextRequest) {
  const notConfigured = ensureConfigured()
  if (notConfigured) return notConfigured

  // Only JSON GraphQL payloads are proxied
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { errors: [{ message: "Only Content-Type: application/json is accepted" }] },
      { status: 415 },
    )
  }

  const browserCookieHeader = request.headers.get("cookie") ?? ""
  let csrf = readCookie(browserCookieHeader, "csrftoken")
  let backendCookieHeader = buildBackendCookieHeader(browserCookieHeader)

  // If the browser has no csrftoken, fetch one and use it in this request
  if (!csrf) {
    csrf = await fetchFreshCsrfToken()
    if (!csrf) {
      return NextResponse.json({ errors: [{ message: "Failed to fetch csrftoken" }] }, { status: 502 })
    }
    backendCookieHeader = backendCookieHeader
      ? `${backendCookieHeader}; csrftoken=${csrf}`
      : `csrftoken=${csrf}`
  }

  const payload = await request.text()
  const backendRes = await fetch(
    BACKEND_URL,
    withDevTlsAgent({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRFToken": csrf,
        // Referer must match the backend URL: Django's CSRF check on HTTPS
        // rejects foreign Referer headers.
        Referer: BACKEND_URL,
        Cookie: backendCookieHeader,
      },
      body: payload,
      cache: "no-store",
    }),
  )

  const body = await backendRes.text()
  const res = new NextResponse(body, {
    status: backendRes.status,
    headers: {
      "Content-Type": backendRes.headers.get("content-type") ?? "application/json",
    },
  })

  // Forward backend cookies (session/refresh/csrftoken rotation) to the browser
  // with the Domain attribute stripped so the browser accepts them
  for (const cookie of getSetCookies(backendRes.headers)) {
    res.headers.append("set-cookie", sanitizeSetCookie(cookie))
  }
  return res
}
