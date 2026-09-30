"use client"

// صفحه‌ی دسته‌بندی‌ها — لیست پشت پرمیشن CATALOGUE_MANAGER قفل است (تست‌شده).
import { Lock } from "lucide-react"

import { Card, CardContent } from "@workspace/ui/components/card"

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">دسته‌بندی‌ها</h1>
        <p className="text-muted-foreground text-sm">مدیریت دسته‌بندی‌های فروشگاه</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="bg-warning/10 text-warning flex size-12 items-center justify-center rounded-full">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="space-y-1.5 max-w-md">
            <p className="font-medium">دسترسی به فهرست دسته‌بندی‌ها محدود است</p>
            <p className="text-muted-foreground text-sm leading-6">
              اکانت فعلی پرمیشن{" "}
              <span dir="ltr" className="font-mono text-xs">CATALOGUE_MANAGER</span> را
              ندارد که بک‌اند برای خواندن دسته‌بندی‌ها می‌خواهد. پس از باز شدن پرمیشن در
              بک‌اند، این صفحه لیست کامل با درخت دسته‌ها را نشان می‌دهد.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
