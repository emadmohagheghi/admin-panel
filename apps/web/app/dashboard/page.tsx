"use client"

// صفحه‌ی نمای کلی — کارت‌های آمار با کوئری DashboardStats (urql + TypedDocumentNode).
// دسته‌بندی‌ها حذف شد چون totalCount آن هم پشت پرمیشن CATALOGUE_MANAGER قفل است.
import { useQuery } from "urql"
import { Layers, Package, Users } from "lucide-react"
import { DashboardStatsDocument } from "@workspace/graphql"

import { Card, CardContent } from "@workspace/ui/components/card"

const STATS = [
  { key: "products", label: "محصولات", icon: Package, href: "/dashboard/products" },
  { key: "variants", label: "واریانت‌ها", icon: Layers, href: "/dashboard/variants" },
  { key: "users", label: "کاربران", icon: Users, href: "/dashboard/users" },
] as const

type StatsData =
  | {
      products?: { totalCount?: number | null } | null
      variants?: { totalCount?: number | null } | null
      users?: { totalCount?: number | null } | null
    }
    | undefined

/** خواندن count هر بخش از data کوئری (تابع ساده، نه هوک) */
function getStatCount(data: StatsData, key: (typeof STATS)[number]["key"]): number | null {
  if (!data) return null
  const conn = data[key]
  return conn?.totalCount ?? null
}

export default function DashboardOverviewPage() {
  const [{ data, fetching, error }] = useQuery({ query: DashboardStatsDocument })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">نمای کلی</h1>
        <p className="text-muted-foreground text-sm">خلاصه‌ای از وضعیت فروشگاه</p>
      </div>

      {error && (
        <div role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          خطا در دریافت آمار: {error.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {STATS.map((stat) => {
          const count = getStatCount(data, stat.key)
          const showSkeleton = fetching && count === null
          return (
            <Card key={stat.key} className="hover:border-foreground/15 transition-colors">
              <CardContent className="flex items-center gap-4">
                <span className="bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <stat.icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                  {showSkeleton ? (
                    <div className="bg-muted h-6 w-12 animate-pulse rounded" aria-hidden />
                  ) : (
                    <p className="text-2xl font-bold tabular-nums">{count ?? "—"}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
