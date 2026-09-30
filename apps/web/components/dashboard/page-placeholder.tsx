"use client"

// Placeholder صفحات بخش‌ها — تا مرحله‌ی CRUD، ناوبری و empty state تمیز دارد.
import Link from "next/link"
import { ArrowLeft, Construction } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

type PagePlaceholderProps = {
  title: string
  description: string
  backHref: string
}

export function PagePlaceholder({ title, description, backHref }: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <div className="bg-card border-border/60 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-20 text-center">
        <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
          <Construction className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="font-medium">در حال ساخت</p>
          <p className="text-muted-foreground max-w-sm text-sm leading-6">
            این بخش در مرحله‌ی بعد (لیست‌های کامل با جدول و فیلتر) اضافه می‌شود.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={backHref} />}
        >
          <ArrowLeft aria-hidden data-icon="inline-start" />
          بازگشت به نمای کلی
        </Button>
      </div>
    </div>
  )
}
