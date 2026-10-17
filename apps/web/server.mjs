// Custom Next.js server: serves the app AND relays same-origin WebSocket
// subscriptions to the Django backend (graphql-transport-ws protocol).
//
// Why a relay: the browser's HttpOnly `access` cookie lives on THIS origin
// (the HTTP proxy in app/api/graphql strips the backend's Domain attribute),
// and the backend certificate is self-signed — so the browser cannot dial the
// backend's WS endpoint directly (no cross-site cookies + untrusted TLS).
// This relay accepts the browser socket same-origin, re-dials the backend
// while attaching the `access` cookie server-side (exactly like the POST
// proxy does), and pipes frames both ways. It is protocol-transparent: the
// backend answers client keep-alive pings itself.
//
// Security notes:
// 1) Only the exact WS path is handled; every other upgrade (Next HMR in dev)
//    falls through to Next's own upgrade handler, which Next attaches to this
//    server lazily on the first request.
// 2) The Origin header must match Host (blocks cross-site socket hijacking).
// 3) Only the `access` cookie is forwarded — never csrftoken or anything else.
// 4) TLS policy mirrors lib/backend.ts: relaxed only in dev or when
//    GRAPHQL_ALLOW_INSECURE_TLS is set, strict otherwise. Keep in sync.
import { createServer } from "node:http"
import process from "node:process"

import next from "next"
import { WebSocket, WebSocketServer } from "ws"

const DEV = !process.argv.includes("--prod")

/** Must stay in sync with GRAPHQL_WS_PATH in lib/urql-env.ts */
const WS_PATH = "/api/graphql-ws"
const PROTOCOL = "graphql-transport-ws"

// Backend/env-backed settings are deliberately NOT read at module top: Next
// loads .env.local into process.env while the app initializes (loadConfig →
// loadEnvConfig inside app.prepare()), so top-level reads would capture
// pre-load values. They are read right after prepare() below.

/** Backend WS endpoint — https→wss, http→ws. Null when unconfigured/broken. */
function backendWsUrl() {
  if (!BACKEND_URL) return null
  try {
    const url = new URL(BACKEND_URL)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    return url.toString()
  } catch {
    return null
  }
}

/** Read a single cookie value from a Cookie header */
function readCookie(cookieHeader, name) {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

function rejectUpgrade(socket, status, statusText) {
  socket.write(`HTTP/1.1 ${status} ${statusText}\r\nConnection: close\r\n\r\n`)
  socket.destroy()
}

/** Reason strings are capped at 123 bytes by the WS protocol */
function shortReason(reason) {
  return String(reason ?? "").slice(0, 100)
}

/**
 * Pipe one browser socket to one backend socket.
 * Browser → backend messages are buffered until the backend dial completes,
 * so the browser client's connection_init is never lost. Close codes flow in
 * both directions; transient failures use 1013 (Try Again Later) so the
 * graphql-ws client retries with backoff.
 */
function relay(browser, access) {
  const target = backendWsUrl()
  if (!target) {
    console.error("[graphql-ws] GRAPHQL_BACKEND_ENDPOINT is not configured")
    browser.close(1011, "backend not configured")
    return
  }

  const backend = new WebSocket(target, [PROTOCOL], {
    headers: access ? { Cookie: `access=${access}` } : {},
    rejectUnauthorized: !RELAXED_TLS,
  })

  const pending = []
  let backendOpen = false
  let closed = false

  const closeBoth = (code, reason) => {
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

const app = next({ dev: DEV })
await app.prepare()

// Env is fully loaded now (.env.local included).
const PORT = Number(process.env.PORT ?? 3000)
const BACKEND_URL = process.env.GRAPHQL_BACKEND_ENDPOINT ?? ""
/** Same rule as relaxedTlsAgent in lib/backend.ts */
const RELAXED_TLS =
  DEV ||
  ["1", "true"].includes(
    (process.env.GRAPHQL_ALLOW_INSECURE_TLS ?? "").trim().toLowerCase(),
  )

const handle = app.getRequestHandler()
const server = createServer((req, res) => handle(req, res))

const wss = new WebSocketServer({
  noServer: true,
  handleProtocols: (protocols) => (protocols.has(PROTOCOL) ? PROTOCOL : false),
})

// Runs before Next's own upgrade listener (attached lazily on first request).
server.on("upgrade", (req, socket, head) => {
  let url
  try {
    url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`)
  } catch {
    socket.destroy()
    return
  }
  if (url.pathname !== WS_PATH) return // Next handles HMR et al.

  const host = req.headers.host
  let originHost = null
  try {
    originHost = req.headers.origin ? new URL(req.headers.origin).host : null
  } catch {
    originHost = null
  }
  if (!host || !originHost || originHost !== host) {
    rejectUpgrade(socket, 403, "Forbidden")
    return
  }

  // Only graphql-transport-ws clients may connect: ws would otherwise accept
  // the handshake without a negotiated protocol (handleProtocols returning
  // false is not fatal there), and forwarding mismatched frames would break.
  const offered = (req.headers["sec-websocket-protocol"] ?? "")
    .split(",")
    .map((p) => p.trim())
  if (!offered.includes(PROTOCOL)) {
    rejectUpgrade(socket, 400, "Bad Request")
    return
  }

  const access = readCookie(req.headers.cookie ?? "", "access")
  wss.handleUpgrade(req, socket, head, (browser) => relay(browser, access))
})

server.listen(PORT, () => {
  console.log(
    `> Ready on http://localhost:${PORT} (${DEV ? "development" : "production"}) — WS relay at ${WS_PATH}`,
  )
})
