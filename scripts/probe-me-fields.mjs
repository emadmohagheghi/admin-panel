// کاوش فیلدهای مجاز در کوئری me (برای اکانت .env.local)
// اجرا: node scripts/probe-me-fields.mjs [base-url]
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
async function gql(query) {
  const res = await fetch(PROXY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": decodeURIComponent(store.csrftoken ?? ""),
      Cookie: cookieHeader(),
    },
    body: JSON.stringify({ query }),
  })
  collect(res.headers.getSetCookie?.() ?? [])
  return res.json()
}

const env = readEnvLocal()

// ورود
await fetch(PROXY)
const login = await gql(
  `mutation { login(email: ${JSON.stringify(env.DASHBOARD_EMAIL)}, password: ${JSON.stringify(env.DASHBOARD_PASSWORD)}) { ok } }`,
)
if (!login.data?.login?.ok) {
  console.error("✗ لاگین ناموفق")
  process.exit(1)
}

// هر فیلد جداگانه
const fields = [
  "id", "email", "firstName", "lastName", "description",
  "isStaff", "isActive", "isConfirmed", "isSuperuser",
  "dateJoined", "updatedAt", "lastLogin", "onlineStatus",
  "languageCode", "avatar { url }",
]
for (const f of fields) {
  const r = await gql(`query { me { ${f} } }`)
  const err = r.errors?.[0]?.message
  const val = JSON.stringify(r.data?.me ?? null)
  console.log(err ? `✗ ${f} → ${err.slice(0, 80)}` : `✓ ${f} → ${val.slice(0, 60)}`)
}
