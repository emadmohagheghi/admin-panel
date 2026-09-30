// تست جریان JWT refresh از طریق پروکسی same-origin:
// ۱) login با اعتبارنامه‌های .env.local → کوکی‌های access/refresh/csrftoken ست می‌شوند
// ۲) me بدون access (فقط refresh) → انتظار: null یا خطای احراز هویت
// ۳) refresh با refresh cookie → انتظار: ok:true + Set-Cookie access تازه
// ۴) me با access تازه → انتظار: داده‌ی کاربر
// اعتبارنامه‌ها فقط از .env.local خوانده می‌شوند و هیچ‌جا چاپ نمی‌شوند.
// اجرا: node scripts/test-jwt-refresh.mjs [base-url]  (پیش‌فرض http://localhost:3000)
import fs from "node:fs"
import path from "node:path"

const BASE = process.argv[2] ?? "http://localhost:3000"
const PROXY = `${BASE}/api/graphql`

/** خواندن کلیدهای .env.local (بدون چاپ مقادیر) */
function readEnvLocal() {
  const file = path.resolve("apps/web/.env.local")
  const env = {}
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
    if (m) env[m[1]] = m[2]
  }
  return env
}

/** استخراج کوکی‌ها از هدرهای Set-Cookie پاسخ */
function collectCookies(store, setCookieHeaders) {
  for (const header of setCookieHeaders) {
    const [pair, ...attrs] = header.split(";")
    const eq = pair.indexOf("=")
    const name = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    // کوکی حذف‌شده (Max-Age=0) را پاک می‌کنیم
    const expired = /max-age=0/i.test(attrs.join(";"))
    if (expired) delete store[name]
    else store[name] = value
  }
}

function cookieHeader(store, only) {
  const entries = Object.entries(store).filter(([name]) => !only || only.includes(name))
  return entries.map(([name, value]) => `${name}=${value}`).join("; ")
}

async function graphql(store, query, variables, cookieFilter) {
  const csrf = store.csrftoken ?? ""
  const res = await fetch(PROXY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": decodeURIComponent(csrf),
      Cookie: cookieHeader(store, cookieFilter),
    },
    body: JSON.stringify({ query, variables }),
  })
  collectCookies(store, res.headers.getSetCookie?.() ?? [])
  return res.json()
}

const env = readEnvLocal()
if (!env.DASHBOARD_EMAIL || !env.DASHBOARD_PASSWORD) {
  console.error("✗ DASHBOARD_EMAIL/DASHBOARD_PASSWORD در .env.local خالی است")
  process.exit(1)
}

const store = {}

// ۰) گرفتن csrftoken اولیه
const page = await fetch(PROXY)
collectCookies(store, page.headers.getSetCookie?.() ?? [])
if (!store.csrftoken) {
  console.error("✗ csrftoken از پروکسی گرفته نشد")
  process.exit(1)
}

// ۱) لاگین
const login = await graphql(
  store,
  'mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { ok status message } }',
  { email: env.DASHBOARD_EMAIL, password: env.DASHBOARD_PASSWORD },
)
if (!login.data?.login?.ok) {
  console.error("✗ لاگین ناموفق:", JSON.stringify(login.data?.login ?? login.errors))
  process.exit(1)
}
console.log("✓ لاگین موفق — کوکی‌ها:", Object.keys(store).join(", "))

// ۲) me بدون access (شبیه‌سازی حذف دستی کوکی از DevTools)
const meWithoutAccess = await graphql(
  store,
  'query Me { me { id email } }',
  {},
  ["csrftoken", "refresh"],
)
const meNull = !meWithoutAccess.data?.me
console.log(
  meNull
    ? "✓ me بدون access → null/خطا (همان‌طور که انتظار می‌رفت)"
    : "⚠ me بدون access هم کاربر داد (access لازم نیست؟)",
)

// ۳) refresh با کوکی refresh
const refresh = await graphql(
  store,
  'mutation Refresh { refresh { ok status message } }',
  {},
  ["csrftoken", "refresh"],
)
const refreshOk = refresh.data?.refresh?.ok === true
console.log(
  refreshOk
    ? `✓ refresh → ok:true${store.access ? " + access تازه ست شد" : " (access ست نشد!)"}`
    : "✗ refresh ناموفق: " + JSON.stringify(refresh.data?.refresh ?? refresh.errors),
)

// ۴) me با سشن تازه
const meAfter = await graphql(
  store,
  'query Me { me { email firstName lastName isStaff } }',
  {},
  ["csrftoken", "access", "refresh"],
)
const user = meAfter.data?.me
if (user) {
  console.log(`✓ me بعد از refresh → کاربر: ${user.email}`)
  console.log("\n🎉 کل جریان JWT refresh سالم است")
} else {
  console.error("✗ me بعد از refresh هم شکست خورد:", JSON.stringify(meAfter.errors ?? meAfter.data))
  process.exit(1)
}
