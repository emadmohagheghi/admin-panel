// Vercel deployment of the same-origin WS relay. Locally the custom server
// (server.mjs) handles /api/graphql-ws at the HTTP layer before Next sees it —
// Vercel never runs custom servers, so here the platform's upgradeWebSocket()
// takes over the upgrade instead. Keep the relay logic below in sync with the
// relay() in server.mjs (same trust model as the HTTP proxy in
// app/api/graphql/route.ts):
// 1) Origin must match the effective host (Host or proxy X-Forwarded-Host).
// 2) Only the `access` cookie is forwarded — never csrftoken or anything else.
// 3) TLS policy mirrors lib/backend.ts: relaxed only when
//    GRAPHQL_ALLOW_INSECURE_TLS is set, strict otherwise.
import { WebSocket, type RawData } from "ws"

import { upgradeWebSocket } from "@vercel/functions"
import { connection } from "next/server"

/** Must stay in sync with GRAPHQL_WS_PATH in lib/urql-env.ts */
const PROTOCOL = "graphql-transport-ws"

/** Backend WS endpoint — https→wss, http→ws. Null when unconfigured/broken. */
function backendWsUrl(): string | null {
  const backend = process.env.GRAPHQL_BACKEND_ENDPOINT
  if (!backend) return null
  try {
    const url = new URL(backend)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    return url.toString()
  } catch {
    return null
  }
}

/** Read a single cookie value from a Cookie header */
function readCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

/** Lowercase and drop default ports so `Example.com:443` === `example.com`. */
function normalizeHost(value: string): string {
  return String(value).trim().toLowerCase().replace(/:(80|443)$/, "")
}

/**
 * Does the browser Origin match any known effective host? Behind a reverse
 * proxy the Host header may carry an internal address, while the public
 * hostname arrives via X-Forwarded-Host.
 */
function sameOrigin(originHeader: string | null, hostCandidates: (string | null)[]): boolean {
  if (!originHeader) return false
  let originHost: string
  try {
    originHost = new URL(originHeader).host // URL API lowercases + strips default ports
  } catch {
    return false
  }
  const target = normalizeHost(originHost)
  return hostCandidates.some((h) => h && normalizeHost(h) === target)
}

/** Reason strings are capped at 123 bytes by the WS protocol */
function shortReason(reason: unknown): string {
  return String(reason ?? "").slice(0, 100)
}

/**
 * Pipe the browser socket to one backend socket.
 * Browser → backend messages are buffered until the backend dial completes,
 * so the client's connection_init is never lost. Transient failures use 1013
 * (Try Again Later) so the graphql-ws client retries with backoff.
 */
function relay(browser: WebSocket, access: string | null): void {
  const target = backendWsUrl()
  if (!target) {
    console.error("[graphql-ws] GRAPHQL_BACKEND_ENDPOINT is not configured")
    browser.close(1011, "backend not configured")
    return
  }

  const backend = new WebSocket(target, [PROTOCOL], {
    headers: access ? { Cookie: `access=${access}` } : {},
    rejectUnauthorized: !["1", "true"].includes(
      (process.env.GRAPHQL_ALLOW_INSECURE_TLS ?? "").trim().toLowerCase(),
    ),
  })

  const pending: Array<[RawData, boolean]> = []
  let backendOpen = false
  let closed = false

  const closeBoth = (code: number, reason: string) => {
    if (closed) return
    closed = true
    try {
      browser.close(code, shortReason(reason))
    } catch {
      /* peer already gone */
    }
    try {
      backend.close(code, shortReason(reason))
    } catch {
      /* peer already gone */
    }
  }

  const dialTimeout = setTimeout(() => {
    if (backendOpen || closed) return
    console.error(`[graphql-ws] backend dial timed out: ${target}`)
    try {
      backend.terminate()
    } catch {
      /* already dead */
    }
    closeBoth(1013, "backend unreachable")
  }, 10_000)

  browser.on("message", (data, isBinary) => {
    if (backendOpen) backend.send(data, { binary: isBinary })
    else pending.push([data, isBinary])
  })
  browser.on("close", (code, reason) => {
    clearTimeout(dialTimeout)
    if (closed) return
    closed = true
    // 1005/1006 cannot be sent on the wire — normalize to 1000
    const safe = code === 1005 || code === 1006 ? 1000 : code
    try {
      backend.close(safe, shortReason(reason))
    } catch {
      /* already closed */
    }
  })
  browser.on("error", () => {
    clearTimeout(dialTimeout)
    if (closed) return
    closed = true
    try {
      backend.terminate()
    } catch {
      /* nothing to flush */
    }
  })

  backend.on("open", () => {
    clearTimeout(dialTimeout)
    backendOpen = true
    for (const [data, isBinary] of pending) backend.send(data, { binary: isBinary })
    pending.length = 0
  })
  backend.on("message", (data, isBinary) => {
    if (browser.readyState === WebSocket.OPEN) browser.send(data, { binary: isBinary })
  })
  backend.on("close", (code, reason) => {
    clearTimeout(dialTimeout)
    if (closed) return
    closed = true
    // 1005/1006 cannot be sent on the wire — normalize to a retryable 1013
    const safe = code === 1005 || code === 1006 ? 1013 : code
    try {
      browser.close(safe, shortReason(reason))
    } catch {
      /* socket already gone */
    }
  })
  backend.on("error", (err) => {
    clearTimeout(dialTimeout)
    console.error(`[graphql-ws] backend socket error: ${err.message}`)
    closeBoth(1013, "backend error")
  })
}

export async function GET(request: Request): Promise<Response> {
  // Route Handler GETs can be prerendered; an upgrade obviously cannot.
  await connection()

  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  const forwardedHost =
    (request.headers.get("x-forwarded-host") ?? "").split(",").at(0)?.trim() ?? ""
  if (!sameOrigin(origin, [forwardedHost, host])) {
    console.warn(
      `[graphql-ws] rejected upgrade — origin mismatch (origin=${origin ?? "none"} host=${host ?? "none"} x-forwarded-host=${forwardedHost || "none"})`,
    )
    return new Response("Forbidden", { status: 403 })
  }

  // Only graphql-transport-ws clients may connect: forwarding mismatched
  // frames would break the protocol on both sides.
  const offered = (request.headers.get("sec-websocket-protocol") ?? "")
    .split(",")
    .map((p) => p.trim())
  if (!offered.includes(PROTOCOL)) {
    console.warn(
      `[graphql-ws] rejected upgrade — missing "${PROTOCOL}" subprotocol (offered: ${offered.join(", ") || "none"})`,
    )
    return new Response("Bad Request", { status: 400 })
  }

  const access = readCookie(request.headers.get("cookie") ?? "", "access")

  return upgradeWebSocket((ws) => {
    relay(ws, access)
  })
}
