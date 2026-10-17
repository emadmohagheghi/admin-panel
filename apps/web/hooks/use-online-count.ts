"use client"

// Live online-user count via the backend subscription (graphql-ws relay).
//
// Self-healing auth: an expired access cookie makes the backend answer
// subscriptions with "Authentication required." — and because the identity is
// resolved at socket handshake time, re-subscribing on the same socket cannot
// recover. So on an auth error: refresh the session, force-drop the socket
// (terminate() is a normal, non-fatal reconnect for graphql-ws), then
// re-subscribe — once per error episode.
import { useEffect, useRef } from "react"
import { useSubscription } from "urql"

import { UserOnlineCountsDocument } from "@workspace/graphql"

import { isAuthErrorText, refreshSession } from "@/lib/auth-session"
import { getGraphqlWsClient } from "@/lib/urql-ws"

export type OnlineCount = {
  /** Live count; null until the first push (or when the stream errored) */
  count: number | null
  fetching: boolean
  error: string | null
}

export function useOnlineCount(): OnlineCount {
  const [result, executeSubscription] = useSubscription({ query: UserOnlineCountsDocument })
  const recovering = useRef(false)

  const message = result.error?.message ?? null

  useEffect(() => {
    if (!message) {
      // Healthy again → allow future recovery episodes
      recovering.current = false
      return
    }
    if (!isAuthErrorText(message) || recovering.current) return
    recovering.current = true
    void refreshSession()
      .catch(() => false)
      .then(() => {
        getGraphqlWsClient().terminate()
        executeSubscription()
      })
  }, [message, executeSubscription])

  return {
    count: result.data?.userOnlineCounts.onlines ?? null,
    fetching: result.fetching,
    error: message,
  }
}
