// Smoke test مرحله ۲: dev server بالا می‌آید، صفحه‌ی اصلی و پروکسی GraphQL تست می‌شود.
// - GET / → انتظار 200
// - GET /api/graphql → گرفتن کوکی csrftoken از طریق rewrite
// - POST /api/graphql با CSRF → کوئری __typename باید data برگرداند
// اجرا: node scripts/smoke-test.mjs
import { spawn } from "node:child_process"

const PORT = process.env.SMOKE_PORT ?? "4321"
const BASE = `http://localhost:${PORT}`
const READY_TIMEOUT_MS = 120_000

/** صبر تا برقراری یک شرط (fetch موفق) */
async function waitFor(name, fn, timeoutMs = READY_TIMEOUT_MS) {
  const start = Date.now()
  let lastErr
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await fn()
      if (result) return result
    } catch (err) {
      lastErr = err
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`timeout waiting for ${name}: ${lastErr?.message ?? "?"}`)
}

const server = spawn("pnpm", ["--filter", "web", "dev", "--port", PORT], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
})

let serverLog = ""
server.stdout.on("data", (d) => (serverLog += d))
server.stderr.on("data", (d) => (serverLog += d))

let exitCode = 0
try {
  // ۱) صبر برای بالا آمدن سرور
  await waitFor(
    "next dev ready",
    async () => {
      const res = await fetch(`${BASE}/`)
      return res.ok
    },
  )
  console.log("✓ dev server ready")

  // ۲) پروکسی GraphQL: گرفتن csrftoken
  const pageRes = await fetch(`${BASE}/api/graphql`)
  const setCookie = pageRes.headers.get("set-cookie") ?? ""
  const csrfToken = /csrftoken=([^;]+)/.exec(setCookie)?.[1]
  if (!csrfToken) throw new Error("csrftoken از پروکسی برگردانده نشد. set-cookie: " + setCookie)
  console.log("✓ proxy GET /api/graphql → csrftoken دریافت شد")

  // ۳) POST از طریق پروکسی با CSRF
  const apiRes = await fetch(`${BASE}/api/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
      Cookie: `csrftoken=${csrfToken}`,
      Referer: `${BASE}/api/graphql`,
    },
    body: JSON.stringify({ query: "query { __typename }" }),
  })
  const body = await apiRes.json()
  if (body?.data?.__typename !== "Query") {
    throw new Error("پاسخ غیرمنتظره از پروکسی: " + JSON.stringify(body))
  }
  console.log("✓ proxy POST /api/graphql →", JSON.stringify(body.data))

  // ۴) صفحه‌ی لاگین باید رندر شود (عنوان فرم فارسی در HTML)
  const loginRes = await fetch(`${BASE}/login`)
  const loginHtml = await loginRes.text()
  if (!loginRes.ok || !loginHtml.includes("ورود به پنل مدیریت")) {
    throw new Error(`صفحه‌ی login رندر نشد (HTTP ${loginRes.status})`)
  }
  console.log("✓ صفحه‌ی /login رندر شد")

  // ۵) گیت احراز هویت: /dashboard بدون کوکی سشن باید به /login ریدایرکت کند
  const dashRes = await fetch(`${BASE}/dashboard`, { redirect: "manual" })
  const location = dashRes.headers.get("location") ?? ""
  if (dashRes.status < 300 || dashRes.status >= 400 || !location.includes("/login")) {
    throw new Error(`گیت داشبورد کار نکرد: status=${dashRes.status} location=${location}`)
  }
  console.log(`✓ گیت /dashboard → redirect به /login (HTTP ${dashRes.status})`)
} catch (err) {
  exitCode = 1
  console.error("✗ SMOKE TEST FAILED:", err.message)
  console.error("--- server log (tail) ---")
  console.error(serverLog.split("\n").slice(-40).join("\n"))
} finally {
  server.kill("SIGTERM")
  // روی ویندوز child.kill کل درخت pnpm را نمی‌کشد؛ پورت را با taskkill آزاد می‌کنیم
  if (process.platform === "win32") {
    try {
      const { execSync } = await import("node:child_process")
      execSync(`powershell -Command "Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`, { stdio: "ignore" })
    } catch {}
  }
}

process.exit(exitCode)
