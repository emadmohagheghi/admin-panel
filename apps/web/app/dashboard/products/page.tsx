"use client"

// صفحه‌ی محصولات — لیست پشت پرمیشن GROUP_MANAGER قفل است (تست‌شده)؛
// فقط شمارش باز است. پیام شفاف می‌دهیم و شمارش را نشان می‌دهیم.
import { useQuery } from "urql"
import { Lock } from "lucide-react"
import { DashboardStatsDocument } from "@workspace/graphql"

import { Card, CardContent } from "@workspace/ui/components/card"

export default function ProductsPage() {
  const [{ data }] = useQuery({ query: DashboardStatsDocument })
  const count = data?.products?.totalCount

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">محصولات</h1>
        <p className="text-muted-foreground text-sm">مدیریت محصولات فروشگاه</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="bg-warning/10 text-warning flex size-12 items-center justify-center rounded-full">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="space-y-1.5 max-w-md">
            <p className="font-medium">دسترسی به فهرست محصولات محدود است</p>
            <p className="text-muted-foreground text-sm leading-6">
              اکانت فعلی پرمیشن <span dir="ltr" className="font-mono text-xs">GROUP_MANAGER</span> را
              ندارد که بک‌اند برای خواندن لیست محصولات می‌خواهد. پس از باز شدن این پرمیشن در
              بک‌اند، همین صفحه به‌صورت خودکار لیست کامل را نشان می‌دهد.
            </p>
            {typeof count === "number" && (
              <p className="text-muted-foreground text-xs">
                شمارش کل محصولات: <span className="tabular-nums font-medium">{count.toLocaleString("fa-IR")}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
