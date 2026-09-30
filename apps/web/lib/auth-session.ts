// توابع سشن سمت کلاینت: تضمین csrftoken قبل از اولین POST، خواندن me و خروج.
// از کلاینت urql با TypedDocumentNodeهای تایپ‌سیف @workspace/graphql استفاده می‌کنیم؛
// urql به صورت native TypedDocumentNode را می‌فهمد و نتیجه کاملاً تایپ‌شده است.
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

/** گرفتن csrftoken اگر مرورگر هنوز ندارد (GET پروکسی کوکی را ست می‌کند) */
export async function ensureCsrfToken(): Promise<void> {
  if (typeof document !== "undefined" && document.cookie.includes("csrftoken=")) return
  await fetch(GRAPHQL_PROXY_PATH, { credentials: "include" })
}

function readCsrfCookie(): string {
  const m = /(?:^|;\s*)csrftoken=([^;]+)/.exec(document.cookie)
  return m ? decodeURIComponent(m[1] ?? "") : ""
}

/** پیام خطای خوانا از CombinedError */
export function graphQLErrorMessage(err: CombinedError | undefined): string {
  if (!err) return ""
  return err.graphQLErrors[0]?.message ?? err.networkError?.message ?? "خطای ناشناخته"
}

export type FetchMeResult =
  | { user: Me }
  | { error: string }
  | null

/** آیا خطا از جنس احراز هویت است؟ (باید با isAuthError در lib/urql هم‌راستا بماند) */
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
 * خواندن کاربر جاری با تفکیک خطا:
 * - { user } → سشن معتبر
 * - { error } → خطای غیراحراز-هویتی (مثل پرمیشن) — نباید ریدایرکت شود، باید نمایش داده شود
 * - null → واقعاً لاگین نیست (خطای auth یا کاربر null بعد از تلاش برای refresh)
 *
 * دو مسیر بازیابی سشن:
 * ۱) اگر me خطای احراز هویت بدهد، authExchange (در lib/urql) خودش یک بار
 *    refresh می‌زند و کوئری را تکرار می‌کند.
 * ۲) اگر me بدون خطا null بدهد (بک‌اند به‌جای خطا null برگردانده)، اینجا
 *    دستی یک بار refresh می‌زنیم و دوباره me را می‌خوانیم.
 */
export async function fetchMe(): Promise<FetchMeResult> {
  await ensureCsrfToken()
  const client = makeClient()

  let result = await client.query(MeDocument, {}).toPromise()

  if (!result.error && result.data && result.data.me === null) {
    // شاید access منقضی/حذف شده ولی refresh معتبر است
    await client.mutation(RefreshSessionDocument, {}).toPromise()
    result = await client.query(MeDocument, {}).toPromise()
  }

  if (result.error) {
    // خطای احراز هویت → «لاگین نیست»؛ خطای دیگر → نمایش داده شود
    return isAuthErrorText(result.error.message) ? null : { error: result.error.message }
  }
  if (!result.data) return null
  return result.data.me ? { user: result.data.me } : null
}

/** لاگین — نتیجه‌ی ساختاریافته‌ی بک‌اند برمی‌گردد (ok/status/message) */
export async function login(email: string, password: string): Promise<LoginResult> {
  await ensureCsrfToken()
  // هدر X-CSRFToken لازم است چون میوتیشن unprotected نیست
  const { data, error } = await makeClient()
    .mutation(LoginDocument, { email, password }, {
      fetchOptions: { headers: { "X-CSRFToken": readCsrfCookie() } },
    })
    .toPromise()
  if (error || !data?.login) {
    throw new Error(graphQLErrorMessage(error) || "پاسخ لاگین نامعتبر بود")
  }
  return data.login
}

/** خروج از حساب */
export async function logout(): Promise<void> {
  await makeClient()
    .mutation(LogoutDocument, {}, {
      fetchOptions: { headers: { "X-CSRFToken": readCsrfCookie() } },
    })
    .toPromise()
}
