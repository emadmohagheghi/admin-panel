"use client"

// graphql-ws client for the same-origin WS relay in server.mjs.
// Kept outside React: graphql-ws owns the socket lifecycle and reconnection,
// so the client must outlive individual components (lazy singleton).
import { createClient, type Client } from "graphql-ws"

import { GRAPHQL_WS_PATH } from "@/lib/urql-env"

/** Keep an idle socket briefly so page navigation doesn't churn connections */
const LAZY_CLOSE_TIMEOUT_MS = 5_000

let client: Client | null = null

export function getGraphqlWsClient(): Client {
  if (client) return client

  // Same-origin only: the HttpOnly access cookie is attached by the browser
  // automatically; the relay forwards it to the backend at dial time.
  const scheme = window.location.protocol === "https:" ? "wss" : "ws"

  client = createClient({
    url: `${scheme}://${window.location.host}${GRAPHQL_WS_PATH}`,
    // The backend answers pings itself (verified), so keep-alive flows through
    // the relay end-to-end.
    keepAlive: 20_000,
    lazyCloseTimeout: LAZY_CLOSE_TIMEOUT_MS,
    // Never give up silently: the relay closes with 1013 ("try again later")
    // for transient backend failures. Auth errors arrive as GraphQL errors
    // (recovered in useOnlineCount), not as fatal close codes.
    retryAttempts: Number.POSITIVE_INFINITY,
    shouldRetry: () => true,
    // Default backoff is unbounded exponential; cap at 30s plus jitter so many
    // tabs reconnecting at once don't stampede the backend.
    retryWait: (retries) =>
      new Promise((resolve) => {
        const capped = Math.min(1_000 * 2 ** Math.min(retries, 5), 30_000)
        setTimeout(resolve, capped + Math.random() * 1_000)
      }),
  })

  return client
}
