// پروکسی same-origin برای endpoint GraphQL بک‌اند Django.
//
// تضمین‌های امنیتی این هندلر:
// ۱) URL مقصد فقط از env می‌آید (GRAPHQL_BACKEND_ENDPOINT) — هیچ ورودی
//    کلاینتی در ساخت URL استفاده نمی‌شود؛ فقط یک مسیر ثابت پروکسی می‌شود.
// ۲) هدرهای درخواست کلاینت کپی نمی‌شوند؛ فقط هدرهای لازم سمت سرور ساخته می‌شوند:
//    Content-Type / Accept / X-CSRFToken / Referer / Cookie (فقط کوکی‌های مجاز).
// ۳) کوکی‌های ارسالی به بک‌اند whitelist دارند (csrftoken + کوکی‌های سشن
//    تعریف‌شده در SESSION_COOKIE_NAME/SESSION_COOKIE_NAMES) تا کوکی‌های
//    نامرتبط دامنه‌ی ما به بیرون لو نروند.
// ۴) Set-Cookieهای بک‌اند قبل از پاس‌دادن به مرورگر، attribute Domainشان حذف
//    می‌شود تا مرورگر آن‌ها را بپذیرد.
//
// چرا Route Handler و نه rewrites؟ چون Django روی HTTPS هدر Referer خارجی را
// رد می‌کند (تست‌شده: POST با Referer مال localhost → 403 CSRF verification).
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.GRAPHQL_BACKEND_ENDPOINT ?? ""

/** کوکی سشن برای گیت proxy.ts (پیش‌فرض: استاندارد Django) */
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "sessionid"
/** نام‌های اضافه‌ی کوکی‌های مجاز (مثل توکن refresh) — بعد از لاگین واقعی کامل می‌شود */
const EXTRA_ALLOWED_COOKIES = (process.env.SESSION_COOKIE_NAMES ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean)

/** فقط این کوکی‌ها به بک‌اند می‌روند */
const ALLOWED_COOKIE_NAMES = new Set(["csrftoken", SESSION_COOKIE_NAME, ...EXTRA_ALLOWED_COOKIES])

/** خواندن مقدار یک کوکی از هدر Cookie */
function readCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

/** ساخت هدر Cookie برای بک‌اند فقط از کوکی‌های مجاز (whitelist) */
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

/** استخراج کوکی‌های Set-Cookie — پوشش تایپ قدیمی‌تر Headers */
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
 * حذف attribute Domain از Set-Cookie بک‌اند.
 * کوکی با Domain دامنه‌ی دیگر توسط مرورگر رد می‌شود؛ با حذفش، کوکی
 * host-only روی دامنه‌ی خود اپ ست می‌شود و در درخواست‌های بعدی برمی‌گردد.
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
      { errors: [{ message: "GRAPHQL_BACKEND_ENDPOINT تنظیم نشده است" }] },
      { status: 500 },
    )
  }
  return null
}

/**
 * گرفتن csrftoken تازه از بک‌اند (GET صفحه‌ی GraphiQL).
 * برای شروع جلسه‌ی CSRF وقتی مرورگر هنوز کوکی ندارد.
 */
async function fetchFreshCsrfToken(): Promise<string | null> {
  const res = await fetch(BACKEND_URL, {
    headers: { Accept: "text/html" },
    cache: "no-store",
  })
  if (!res.ok) return null
  return extractCsrfToken(getSetCookies(res.headers))
}

/**
 * GET: گرفتن کوکی csrftoken از بک‌اند و ست‌کردن آن روی دامنه‌ی ما.
 * کلاینت قبل از اولین POST یک بار این را صدا می‌زند.
 */
export async function GET() {
  const notConfigured = ensureConfigured()
  if (notConfigured) return notConfigured

  const csrf = await fetchFreshCsrfToken()
  if (!csrf) {
    return NextResponse.json({ errors: [{ message: "csrftoken دریافت نشد" }] }, { status: 502 })
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
 * POST: پاس‌دادن کوئری/میوتیشن به بک‌اند با CSRF کامل.
 * کوکی‌های مجاز مرورگر به بک‌اند می‌روند و Set-Cookieهای بک‌اند
 * (سشن / چرخش توکن) به مرورگر برمی‌گردند.
 */
export async function POST(request: NextRequest) {
  const notConfigured = ensureConfigured()
  if (notConfigured) return notConfigured

  // فقط JSON GraphQL را پروکسی می‌کنیم
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { errors: [{ message: "فقط Content-Type: application/json پذیرفته می‌شود" }] },
      { status: 415 },
    )
  }

  const browserCookieHeader = request.headers.get("cookie") ?? ""
  let csrf = readCookie(browserCookieHeader, "csrftoken")
  let backendCookieHeader = buildBackendCookieHeader(browserCookieHeader)

  // اگر مرورگر csrftoken ندارد، یکی از بک‌اند می‌گیریم و در همین درخواست استفاده می‌کنیم
  if (!csrf) {
    csrf = await fetchFreshCsrfToken()
    if (!csrf) {
      return NextResponse.json({ errors: [{ message: "csrftoken دریافت نشد" }] }, { status: 502 })
    }
    backendCookieHeader = backendCookieHeader
      ? `${backendCookieHeader}; csrftoken=${csrf}`
      : `csrftoken=${csrf}`
  }

  const payload = await request.text()
  const backendRes = await fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRFToken": csrf,
      Referer: BACKEND_URL,
      Cookie: backendCookieHeader,
    },
    body: payload,
    cache: "no-store",
  })

  const body = await backendRes.text()
  const res = new NextResponse(body, {
    status: backendRes.status,
    headers: {
      "Content-Type": backendRes.headers.get("content-type") ?? "application/json",
    },
  })

  // پاس‌دادن کوکی‌های بک‌اند (سشن/refresh/چرخش csrftoken) به مرورگر —
  // با حذف Domain تا مرورگر آن‌ها را برای دامنه‌ی خود ما بپذیرد
  for (const cookie of getSetCookies(backendRes.headers)) {
    res.headers.append("set-cookie", sanitizeSetCookie(cookie))
  }
  return res
}
