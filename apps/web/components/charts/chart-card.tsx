"use client"

// Shared card shell for dashboard charts: consistent header, loading
// skeleton, and empty state so the five chart components stay small.
import { cn } from "@workspace/ui/lib/utils"
import type { ComponentProps, ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type ChartCardProps = ComponentProps<typeof Card> & {
  title: string
  description?: string
  headerAction?: ReactNode
}

export function ChartCard({ title, description, headerAction, className, children, ...props }: ChartCardProps) {
  return (
    <Card className={cn("shadow-none dark:ring-0", className)} {...props}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {headerAction}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function ChartSkeleton() {
  return (
    <div className="flex h-64 flex-col justify-end gap-2" aria-hidden>
      <div className="bg-muted h-full w-full animate-pulse rounded-lg" />
    </div>
  )
}

export function ChartEmpty({ message = "No data yet" }: { message?: string }) {
  return (
    <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
      {message}
    </div>
  )
}
