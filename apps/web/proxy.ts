// گیت احراز هویت در لبه (جایگزین middleware منسوخ‌شده در این نسخه‌ی Next).
// روت‌های /dashboard بدون کوکی سشن به /login ریدایرکت می‌شوند.
// توجه: نام دقیق کوکی سشن بک‌اند هنوز تأیید نشده؛ با env قابل تنظیم است
// و بعد از اولین لاگین واقعی تأیید/تنظیم می‌شود.
import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "sessionid"
const LOGIN_PATH = "/login"

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE)
  if (hasSession) return NextResponse.next()

  const loginUrl = new URL(LOGIN_PATH, request.url)
  loginUrl.searchParams.set("next", request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
