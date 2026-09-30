// Proxy path env — kept separate to avoid a circular import between urql.ts and auth-session
export const GRAPHQL_PROXY_PATH = process.env.GRAPHQL_PROXY_PATH ?? "/api/graphql"
