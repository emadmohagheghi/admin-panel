// توابع سشن سمت کلاینت: تضمین csrftoken قبل از اولین POST، خواندن me و خروج.
// از کلاینت urql با TypedDocumentNodeهای تایپ‌سیف @workspace/graphql استفاده می‌کنیم؛
// urql به صورت native TypedDocumentNode را می‌فهمد و نتیجه کاملاً تایپ‌شده است.
import type { CombinedError } from "urql"
import { LoginDocument, LogoutDocument, MeDocument, type ResultOf } from "@workspace/graphql"

import { GRAPHQL_PROXY_PATH, makeClient } from "@/lib/urql"

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

/** خواندن کاربر جاری — null یعنی لاگین نیست */
export async function fetchMe(): Promise<Me | null> {
  await ensureCsrfToken()
  const { data, error } = await makeClient().query(MeDocument, {}).toPromise()
  if (error || !data) return null
  return data.me ?? null
}

/** لاگین — نتیجه‌ی ساختاریافته‌ی بک‌اند برمی‌گردد (ok/status/message) */
export async function login(email: string, password: string): Promise<LoginResult> {
  await ensureCsrfToken()
  // هدر X-CSRFToken لازم است چون میوتیشن، unprotected نیست
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
