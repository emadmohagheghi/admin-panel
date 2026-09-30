// Edge auth gate (replaces the deprecated middleware convention in this Next.js
// version). JWT auth via cookies: if access is missing but refresh exists, do
// NOT redirect — the client refreshes the session in-place on that page.
// Only redirect to /login when neither cookie exists.
import { NextResponse, type NextRequest } from "next/server"

const ACCESS_COOKIE = process.env.SESSION_COOKIE_NAME ?? "access"
const REFRESH_COOKIES = (process.env.SESSION_COOKIE_NAMES ?? "refresh")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean)
const LOGIN_PATH = "/login"

export function proxy(request: NextRequest) {
  // access present → definitely signed in; neither present → definitely not
  if (request.cookies.has(ACCESS_COOKIE)) return NextResponse.next()
  const hasRefresh = REFRESH_COOKIES.some((name) => request.cookies.has(name))
  if (!hasRefresh) {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  // refresh only: let the page load; the client will refresh the session
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
