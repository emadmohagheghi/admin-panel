// کلاینت urql — به پروکسی same-origin وصل می‌شود (app/api/graphql).
// credentials: "include" باعث می‌شود کوکی‌های سشن/CSRF با هر درخواست بروند و بیاید.
import { cacheExchange, createClient, fetchExchange } from "urql"

export const GRAPHQL_PROXY_PATH = process.env.GRAPHQL_PROXY_PATH ?? "/api/graphql"

export function makeClient() {
  return createClient({
    url: GRAPHQL_PROXY_PATH,
    fetchOptions: {
      credentials: "include" as const,
    },
    // در پنل مدیریت داده‌ها باید تازه باشد: از کش بخوان ولی در پس‌زمینه شبکه را هم چک کن
    requestPolicy: "cache-and-network",
    exchanges: [cacheExchange, fetchExchange],
  })
}
