// Server-only helpers for talking to the Django backend. Shared by the
// GraphQL proxy (app/api/graphql) and the media proxy (app/api/media).
// Strict TLS: the backend must present a publicly trusted certificate.
// No insecure bypass lives here on purpose — unverified HTTPS would leave
// production traffic open to MITM.
export const BACKEND_URL = process.env.GRAPHQL_BACKEND_ENDPOINT ?? ""

export const BACKEND_ORIGIN = (() => {
  try {
    return new URL(BACKEND_URL).origin
  } catch {
    return ""
  }
})()

/**
 * Backend fetch helper. Plain global fetch with full TLS verification and
 * no HTTP caching surprises — callers pass `cache: "no-store"` themselves.
 */
export async function backendFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init)
}
