// Edge auth gate (replaces the deprecated middleware convention in this Next.js
// version). JWT auth via cookies, with LOCAL expiry checks: the gate decodes
// the tokens' exp claim so dead sessions are redirected to /login before the
// page (or any API request) is made — expired access never triggers the
// client's fail-refresh-retry dance against the API.
//
// The signature is not verified here; this is routing, not authorization —
// the backend enforces the real session on every request (see lib/jwt.ts).
//
// - access unexpired → let through
// - access expired/missing but refresh unexpired → let through; the client
//   refreshes the session in-place on that page
// - both expired/missing → redirect to /login, zero API requests
import { NextResponse, type NextRequest } from "next/server"

import { isTokenExpired } from "@/lib/jwt"

const ACCESS_COOKIE = process.env.SESSION_COOKIE_NAME ?? "access"
const REFRESH_COOKIES = (process.env.SESSION_COOKIE_NAMES ?? "refresh")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean)
const LOGIN_PATH = "/login"

function readCookie(request: NextRequest, name: string): string | null {
  return request.cookies.get(name)?.value ?? null
}

export function proxy(request: NextRequest) {
  const access = readCookie(request, ACCESS_COOKIE)
  if (access && !isTokenExpired(access)) return NextResponse.next()

  const refresh = REFRESH_COOKIES.map((name) => readCookie(request, name)).find(Boolean)
  if (refresh && !isTokenExpired(refresh)) {
    // access dead, refresh alive: let the page load; the client refreshes
    // the session in-place
    return NextResponse.next()
  }

  const loginUrl = new URL(LOGIN_PATH, request.url)
  loginUrl.searchParams.set("next", request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
