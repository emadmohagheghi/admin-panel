// urql client — connects to the same-origin proxy (app/api/graphql).
// credentials: "include" sends auth/CSRF cookies with every request.
//
// Refresh logic: with authExchange, any operation that fails with an auth
// error triggers the refresh mutation once, then the same operation is
// retried. If refresh also fails, the error bubbles up to the top level
// (e.g. SessionGate) which sends the user to /login.
import { authExchange } from "@urql/exchange-auth"
import { cacheExchange, createClient, fetchExchange } from "urql"

import { RefreshSessionDocument } from "@workspace/graphql"

import { GRAPHQL_PROXY_PATH } from "@/lib/urql-env"

/** Is this error an auth error? (backend's standard message for forbidden ops) */
function isAuthError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes("does not have access") ||
    m.includes("unauthorized") ||
    m.includes("authentication") ||
    m.includes("not authenticated")
  )
}

export function makeClient() {
  return createClient({
    url: GRAPHQL_PROXY_PATH,
    fetchOptions: {
      credentials: "include" as const,
    },
    // Important: urql v5 sends queries over GET by default ("within-url-limit").
    // Our proxy's GET only bootstraps the CSRF cookie and never forwards
    // GraphQL, so everything must go through POST (the proxy's CSRF-aware path).
    preferGetMethod: false,
    // Admin data should be fresh: read from cache but revalidate in background
    requestPolicy: "cache-and-network",
    exchanges: [
      cacheExchange,
      authExchange(async (utils) => {
        return {
          addAuthToOperation(operation) {
            // Cookies travel automatically via credentials:include; no header needed
            return operation
          },
          didAuthError(error) {
            return error.graphQLErrors.some((e) => isAuthError(e.message))
          },
          async refreshAuth() {
            // Refresh once; the result doesn't matter — if a fresh access token
            // is set, authExchange retries the operation itself
            await utils.mutate(RefreshSessionDocument, {})
          },
        }
      }),
      fetchExchange,
    ],
  })
}
