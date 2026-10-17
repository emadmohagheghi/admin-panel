// Proxy path env — kept separate to avoid a circular import between urql.ts and auth-session
export const GRAPHQL_PROXY_PATH = process.env.GRAPHQL_PROXY_PATH ?? "/api/graphql"

// Same-origin WebSocket relay path — keep in sync with WS_PATH in server.mjs.
// Fixed (not env-driven): this is a NEXT_PUBLIC_ value baked at build time for
// the client and read at runtime by the server; an env mismatch would break
// the relay silently, and there is no reason to make it configurable.
export const GRAPHQL_WS_PATH = "/api/graphql-ws"
