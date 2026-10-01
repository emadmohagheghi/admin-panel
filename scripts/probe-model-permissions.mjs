// کاوش پرمیشن فیلدهای هر لیست با اکانت واقعی (.env.local)
// برای هر مدل: یک کوئری با همه‌ی فیلدها → فیلدهای مجاز از data و
// فیلدهای قفل‌شده از path خطاها استخراج می‌شوند.
// ایمیل‌ها ماسک می‌شوند؛ هیچ مقدار حساسی چاپ یا ذخیره نمی‌شود.
// اجرا: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/probe-model-permissions.mjs [backend-url]
// (گواهی بک‌اند self-signed است؛ این متغیر فقط داخل همین پروسه‌ی یک‌بارمصرف است)
// پیش‌فرض: GRAPHQL_BACKEND_ENDPOINT از apps/web/.env.local خوانده می‌شود.
import fs from "node:fs"
import path from "node:path"

const BACKEND =
  process.argv[2] ??
  readEnvLocal().GRAPHQL_BACKEND_ENDPOINT ??
  "https://193.228.90.241:7777/dashboard/graphql/"

async function backendFetch(url, init = {}) {
  return fetch(url, init)
}

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
async function gql(query, variables = {}) {
  const res = await backendFetch(BACKEND, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": decodeURIComponent(store.csrftoken ?? ""),
      Referer: BACKEND,
      Cookie: cookieHeader(),
    },
    body: JSON.stringify({ query, variables }),
  })
  collect(res.headers.getSetCookie?.() ?? [])
  return res.json()
}

/** کوچک‌سازی مقادیر: ایمیل ماسک، متن‌های بلند کوتاه */
function sanitize(value) {
  let s = JSON.stringify(value)
  s = s.replace(/[\w.+-]+@[\w.-]+\.\w+/g, (m) => `${m.slice(0, 1)}***@***`)
  return s.length > 90 ? s.slice(0, 90) + "…" : s
}

// فیلدهای کاندید هر مدل (بر اساس اسکیما)
const PROBES = [
  {
    name: "products",
    list: "products(first: 3)",
    fields: [
      "totalCount",
      "edges { node { id title slug isPublic createdAt updatedAt metadata description",
      "  productType { id title slug }",
      "  categories { id name slug } } }",
    ],
  },
  {
    name: "categories",
    list: "categories(first: 3, ordering: [])",
    fields: [
      "totalCount",
      "edges { node { id name slug isPublic description updatedAt numchild metadata",
      "  ancestors { id name slug } children { id name } } }",
    ],
  },
  {
    name: "users",
    list: "users(first: 3, ordering: [])",
    fields: [
      "totalCount",
      "edges { node { id email firstName lastName isStaff isActive isConfirmed isSuperuser",
      "  dateJoined updatedAt lastLogin onlineStatus languageCode description avatar { url }",
      "  groups { id name } } }",
    ],
  },
  {
    name: "productClasses",
    list: "productClasses(first: 3)",
    fields: ["totalCount", "edges { node { id title slug requireShipping trackStock abstract } }"],
  },
  {
    name: "attributes",
    list: "attributes(first: 3)",
    fields: ["totalCount", "edges { node { id name slug inputType valueRequired variantOnly } }"],
  },
  {
    name: "variants",
    list: "variants(first: 3)",
    fields: ["totalCount", "edges { node { id sku name trackInventory sortOrder } }"],
  },
  {
    name: "groups",
    list: "groups(first: 3)",
    fields: ["totalCount", "edges { node { id name permissions { id codename } } }"],
  },
  {
    name: "permissions",
    list: "permissions",
    fields: ["label permissions { id name codename }"],
  },
]

const env = readEnvLocal()

// ورود
const page = await backendFetch(BACKEND, { headers: { Accept: "text/html" } })
collect(page.headers.getSetCookie?.() ?? [])
const login = await gql(
  `mutation { login(email: ${JSON.stringify(env.DASHBOARD_EMAIL)}, password: ${JSON.stringify(env.DASHBOARD_PASSWORD)}) { ok message } }`,
)
if (!login.data?.login?.ok) {
  console.error("✗ لاگین ناموفق:", login.data?.login?.message ?? login.errors)
  process.exit(1)
}
console.log("✓ لاگین موفق — شروع کاوش پرمیشن‌ها\n")

for (const probe of PROBES) {
  const query = `query { ${probe.list} { ${probe.fields.join(" ")} } }`
  const r = await gql(query)
  console.log(`\n===== ${probe.name} =====`)
  if (r.errors) {
    // فیلدهای قفل از آخرین segment هر path خطا + پیام پرمیشن
    const locked = new Set()
    for (const e of r.errors) {
      if (e.path) locked.add(String(e.path.at(-1)))
      else locked.add("(کل لیست) " + e.message.slice(0, 60))
    }
    console.log("  قفل‌شده:", [...locked].join(", ") || "?")
    const msgs = [...new Set(r.errors.map((e) => e.message.split(":")[0].slice(0, 70)))]
    for (const m of msgs) console.log("  پیام:", m)
  }
  if (r.data) {
    const conn = r.data[probe.name.split(/(?=[A-Z])/)[0]] ?? r.data[Object.keys(r.data)[0]]
    if (conn?.edges) {
      console.log("  totalCount:", conn.totalCount)
      for (const [i, edge] of conn.edges.entries()) {
        console.log(`  #${i + 1}:`, sanitize(edge.node))
      }
    } else if (conn) {
      console.log("  پاسخ:", sanitize(conn))
    }
  }
}
