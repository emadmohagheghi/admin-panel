// کلاینت urql — به پروکسی same-origin وصل می‌شود (app/api/graphql).
// credentials: "include" باعث می‌شود کوکی‌های access/refresh/csrftoken بروند و بیایند.
//
// منطق refresh: با authExchange، هر عملیاتی که خطای احراز هویت بدهد ابتدا
// میوتیشن refresh یک بار اجرا می‌شود و همان عملیات با access تازه تکرار می‌شود.
// اگر refresh هم شکست بخورد، خطا به سطح بالا (مثل SessionGate) می‌رسد و
// کاربر به /login هدایت می‌شود.
import { authExchange } from "@urql/exchange-auth"
import { cacheExchange, createClient, fetchExchange } from "urql"

import { RefreshSessionDocument } from "@workspace/graphql"

import { GRAPHQL_PROXY_PATH } from "@/lib/urql-env"

/** آیا خطا از جنس احراز هویت است؟ (پیام استاندارد بک‌اند برای عملیات غیرمجاز) */
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
    // مهم: پیش‌فرض urql v5 کوئری‌ها را با GET می‌فرستد («within-url-limit»)؛
    // GET پروکسی ما فقط bootstrap کوکی CSRF است و GraphQL را پاس نمی‌دهد،
    // پس همه‌چیز باید POST برود (مسیر CSRF-aware پروکسی).
    preferGetMethod: false,
    // در پنل مدیریت داده‌ها باید تازه باشد: از کش بخوان ولی در پس‌زمینه شبکه را هم چک کن
    requestPolicy: "cache-and-network",
    exchanges: [
      cacheExchange,
      authExchange(async (utils) => {
        return {
          addAuthToOperation(operation) {
            // کوکی‌ها خودکار با credentials:include می‌روند؛ هدر اضافه‌ای لازم نیست
            return operation
          },
          didAuthError(error) {
            return error.graphQLErrors.some((e) => isAuthError(e.message))
          },
          async refreshAuth() {
            // یک بار refresh؛ نتیجه مهم نیست — اگر access تازه ست شود،
            // authExchange همان عملیات را خودش تکرار می‌کند
            await utils.mutate(RefreshSessionDocument, {})
          },
        }
      }),
      fetchExchange,
    ],
  })
}
