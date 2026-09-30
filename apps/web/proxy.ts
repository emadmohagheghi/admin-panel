// گیت احراز هویت در لبه (جایگزین middleware منسوخ‌شده در این نسخه‌ی Next).
// احراز هویت JWT با کوکی است: اگر access نبود ولی refresh بود، ریدایرکت نمی‌کنیم
// چون کلاینت در همان صفحه با میوتیشن refresh سشن تازه می‌گیرد.
// فقط وقتی هیچ‌کدام نیست، به /login می‌رویم.
import { NextResponse, type NextRequest } from "next/server"

const ACCESS_COOKIE = process.env.SESSION_COOKIE_NAME ?? "access"
const REFRESH_COOKIES = (process.env.SESSION_COOKIE_NAMES ?? "refresh")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean)
const LOGIN_PATH = "/login"

export function proxy(request: NextRequest) {
  // access هست → لاگین قطعی؛ هیچ‌کدام نیست → لاگین قطعی نیست
  if (request.cookies.has(ACCESS_COOKIE)) return NextResponse.next()
  const hasRefresh = REFRESH_COOKIES.some((name) => request.cookies.has(name))
  if (!hasRefresh) {
    const loginUrl = new URL(LOGIN_PATH, request.url)
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  // فقط refresh: صفحه لود می‌شود و کلاینت سشن را با refresh تازه می‌کند
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
