// دانلود اسکیمای GraphQL از بک‌اند Django با هندل کردن جریان CSRF:
// 1) GET صفحه‌ی GraphiQL برای گرفتن کوکی csrftoken
// 2) POST introspection با هدرهای X-CSRFToken و Referer و کوکی
// 3) تبدیل introspection به SDL و ذخیره در schema.json.graphql — منبع codegen
// آدرس از env: GRAPHQL_ENDPOINT (پیش‌فرض: endpoint داشبورد پروژه)
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildClientSchema, printSchema } from "graphql"

const ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "https://ecommerce-zariny.vercel.app/dashboard/graphql/"

const INTROSPECTION_QUERY = /* GraphQL */ `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      types { ...FullType }
      directives { name description locations args { ...InputValue } }
    }
  }
  fragment FullType on __Type {
    kind
    name
    fields(includeDeprecated: true) {
      name
      args { ...InputValue }
      type { ...TypeRef }
    }
    inputFields { ...InputValue }
    interfaces { ...TypeRef }
    enumValues(includeDeprecated: true) { name }
    possibleTypes { ...TypeRef }
  }
  fragment InputValue on __InputValue {
    name
    defaultValue
    type { ...TypeRef }
  }
  fragment TypeRef on __Type {
    kind
    name
    ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } }
  }
`

/** استخراج توکن CSRF از هدر Set-Cookie پاسخ */
function extractCsrfToken(setCookieHeader) {
  const match = /csrftoken=([^;]+)/.exec(setCookieHeader)
  return match?.[1] ?? null
}

async function main() {
  const outPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "schema.json.graphql",
  )

  // مرحله ۱: گرفتن کوکی csrftoken از GET صفحه‌ی GraphiQL
  const pageRes = await fetch(ENDPOINT, { headers: { Accept: "text/html" } })
  if (!pageRes.ok) throw new Error(`GET ${ENDPOINT} failed: ${pageRes.status}`)
  const csrfToken = extractCsrfToken(pageRes.headers.get("set-cookie") ?? "")
  if (!csrfToken) throw new Error("کوکی csrftoken از پاسخ پیدا نشد")

  // مرحله ۲: POST introspection با توکن CSRF و Referer هم‌مبدأ
  const apiRes = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: ENDPOINT,
      "X-CSRFToken": csrfToken,
      Cookie: `csrftoken=${csrfToken}`,
    },
    body: JSON.stringify({ query: INTROSPECTION_QUERY }),
  })
  if (!apiRes.ok) throw new Error(`POST introspection failed: ${apiRes.status}`)
  const body = await apiRes.json()
  if (body.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`)
  }

  // مرحله ۳: تبدیل introspection result به SDL
  const schema = buildClientSchema(body.data)
  await fs.writeFile(outPath, printSchema(schema) + "\n", "utf8")
  console.log(`SDL اسکیما ذخیره شد: ${path.relative(process.cwd(), outPath)}`)
}

main().catch((err) => {
  console.error("fetch-schema failed:", err.message)
  process.exit(1)
})
