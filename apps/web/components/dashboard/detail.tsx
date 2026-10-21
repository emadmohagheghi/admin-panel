"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export function DetailPageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  badges,
  avatar,
}: {
  backHref: string
  backLabel: string
  title: string
  subtitle?: ReactNode
  badges?: ReactNode
  avatar?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={backHref} />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          {backLabel}
        </Button>
      </div>
      <div className="flex min-w-0 flex-wrap items-start gap-4">
        {avatar}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight break-words">
              {title}
            </h1>
            {badges}
          </div>
          {subtitle ? (
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function InfoRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end font-medium break-words">{children}</dd>
    </div>
  )
}

export function JsonMetadata({ value }: { value: unknown }) {
  const hasValue =
    value != null &&
    (typeof value !== "object" || Object.keys(value as object).length > 0)

  if (!hasValue) {
    return <p className="text-sm text-muted-foreground">No metadata</p>
  }

  return (
    <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}
