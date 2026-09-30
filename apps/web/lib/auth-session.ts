// Client-side session helpers: ensure the csrftoken before the first POST,
// read the current user, sign in and sign out.
// Uses the urql client with typed TypedDocumentNodes from @workspace/graphql;
// urql understands TypedDocumentNode natively so results are fully typed.
import type { CombinedError } from "urql"
import {
  LoginDocument,
  LogoutDocument,
  MeDocument,
  RefreshSessionDocument,
  type ResultOf,
} from "@workspace/graphql"

import { GRAPHQL_PROXY_PATH } from "@/lib/urql-env"
import { makeClient } from "@/lib/urql"

export type Me = NonNullable<ResultOf<typeof MeDocument>["me"]>
export type LoginResult = ResultOf<typeof LoginDocument>["login"]

export type FetchMeResult =
  | { user: Me }
  | { error: string }
  | null

/** Fetch the csrftoken if the browser doesn't have one yet (proxy GET sets it) */
export async function ensureCsrfToken(): Promise<void> {
  if (typeof document !== "undefined" && document.cookie.includes("csrftoken=")) return
  await fetch(GRAPHQL_PROXY_PATH, { credentials: "include" })
}

function readCsrfCookie(): string {
  const m = /(?:^|;\s*)csrftoken=([^;]+)/.exec(document.cookie)
  return m ? decodeURIComponent(m[1] ?? "") : ""
}

/** Readable error message from a CombinedError */
export function graphQLErrorMessage(err: CombinedError | undefined): string {
  if (!err) return ""
  return err.graphQLErrors[0]?.message ?? err.networkError?.message ?? "Unknown error"
}

/** Is this an auth error? (must stay in sync with isAuthError in lib/urql) */
function isAuthErrorText(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes("does not have access") ||
    m.includes("unauthorized") ||
    m.includes("authentication") ||
    m.includes("not authenticated")
  )
}

/**
 * Read the current user, distinguishing error kinds:
 * - { user } → valid session
 * - { error } → non-auth error (e.g. permission) — must be shown, not redirected
 * - null → really not signed in (auth error or null user after refresh attempt)
 *
 * Two session-recovery paths:
 * 1) If me fails with an auth error, authExchange (in lib/urql) refreshes once
 *    and retries the query automatically.
 * 2) If me returns null without an error (backend chose null over an error),
 *    refresh manually once and read me again.
 */
export async function fetchMe(): Promise<FetchMeResult> {
  await ensureCsrfToken()
  const client = makeClient()

  let result = await client.query(MeDocument, {}).toPromise()

  if (!result.error && result.data && result.data.me === null) {
    // Maybe the access token expired/was deleted but refresh is still valid
    await client.mutation(RefreshSessionDocument, {}).toPromise()
    result = await client.query(MeDocument, {}).toPromise()
  }

  if (result.error) {
    // Auth error → "not signed in"; any other error → surface it
    return isAuthErrorText(result.error.message) ? null : { error: result.error.message }
  }
  if (!result.data) return null
  return result.data.me ? { user: result.data.me } : null
}

/** Sign in — returns the backend's structured result (ok/status/message) */
export async function login(email: string, password: string): Promise<LoginResult> {
  await ensureCsrfToken()
  // The X-CSRFToken header is required for the login mutation
  const { data, error } = await makeClient()
    .mutation(LoginDocument, { email, password }, {
      fetchOptions: { headers: { "X-CSRFToken": readCsrfCookie() } },
    })
    .toPromise()
  if (error || !data?.login) {
    throw new Error(graphQLErrorMessage(error) || "Invalid login response")
  }
  return data.login
}

/** Sign out */
export async function logout(): Promise<void> {
  await makeClient()
    .mutation(LogoutDocument, {}, {
      fetchOptions: { headers: { "X-CSRFToken": readCsrfCookie() } },
    })
    .toPromise()
}
