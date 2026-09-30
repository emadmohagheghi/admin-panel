// تشخیص حلقه‌ی لاگین — شبیه‌سازی جریان مرورگر:
// لاگین → ذخیره‌ی کوکی‌ها → me با همان کوکی‌ها (بدون فیلتر) → me فقط با access → me فقط با refresh
// خروجی: دقیقاً چه چیزی برای me برمی‌گردد و کوکی‌ها چه هستند (بدون چاپ مقدار کوکی‌ها)
// اجرا: node scripts/diagnose-login-loop.mjs [base-url]
import fs from "node:fs"
import path from "node:path"

const BASE = process.argv[2] ?? "http://localhost:3000"
const PROXY = `${BASE}/api/graphql`

function readEnvLocal() {
  const env = {}
  for (const line of fs.readFileSync(path.resolve("apps/web/.env.local"), "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
    if (m) env[m[1]] = m[2]
  }
  return env
}

const store = {}
function collect(setCookies) {
  for (const header of setCookies) {
    const [pair, ...attrs] = header.split(";")
    const eq = pair.indexOf("=")
    const name = pair.slice(0, eq).trim()
    if (/max-age=0/i.test(attrs.join(";"))) delete store[name]
    else store[name] = pair.slice(eq + 1).trim()
  }
}

function cookieHeader() {
  return Object.entries(store).map(([n, v]) => `${n}=${v}`).join("; ")
}

async function gql(body, cookieFilter) {
  const headers = {
    "Content-Type": "application/json",
  }
  if (store.csrftoken) headers["X-CSRFToken"] = decodeURIComponent(store.csrftoken)
  headers["Cookie"] = cookieFilter
    ? Object.entries(store)
        .filter(([n]) => cookieFilter.includes(n))
        .map(([n, v]) => `${n}=${v}`).join("; ")
    : cookieHeader()
  const res = await fetch(PROXY, { method: "POST", headers, body: JSON.stringify(body) })
  collect(res.headers.getSetCookie?.() ?? [])
  return { status: res.status, json: await res.json() }
}

const env = readEnvLocal()
console.log("== 0) GET پروکسی برای csrftoken ==")
const page = await fetch(PROXY)
collect(page.headers.getSetCookie?.() ?? [])
console.log("   کوکی‌ها:", Object.keys(store).join(", ") || "هیچ")

console.log("\n== 1) لاگین ==")
const login = await gql({
  query: "mutation { login(email: " + JSON.stringify(env.DASHBOARD_EMAIL) + ", password: " + JSON.stringify(env.DASHBOARD_PASSWORD) + ") { ok status message } }",
})
console.log("   نتیجه:", JSON.stringify(login.json.data?.login ?? login.json.errors))
console.log("   کوکی‌ها:", Object.keys(store).join(", "))

console.log("\n== 2) me با همه‌ی کوکی‌ها (آنچه مرورگر می‌فرستد) ==")
const meAll = await gql({ query: "query { me { email firstName lastName isStaff } }" })
console.log("   status:", meAll.status, "| body:", JSON.stringify(meAll.json.data ?? meAll.json.errors))

console.log("\n== 3) me فقط با access (بدون refresh) ==")
const meAccess = await gql(
  { query: "query { me { email } }" },
  ["csrftoken", "access"],
)
console.log("   status:", meAccess.status, "| body:", JSON.stringify(meAccess.json.data ?? meAccess.json.errors))

console.log("\n== 4) me فقط با refresh (بدون access) ==")
const meRefresh = await gql(
  { query: "query { me { email } }",
  },
  ["csrftoken, refresh"],
)
console.log("   status:", meRefresh.status, " | body:", JSON.stringify(meRefresh.json.data ?? meRefresh.json.errors))

console.log("\n== 5) refresh صریح و سپس me ==")
const ref = await gql({ query: "mutation { refresh { ok status message } }" }, ["csrftoken", "refresh"])
console.log("   refresh:", JSON.stringify(ref.json.data?.refresh ?? ref.json.errors))
const meAfter = await gql({ query: "query { me { email } }" })
console.log("   me بعد از refresh:", JSON.stringify(meAfter.json.data?.me ?? meAfter.json.errors))

console.log("\nنتیجه: کوکی‌های پایانی:", Object.keys(store).join(", "))
