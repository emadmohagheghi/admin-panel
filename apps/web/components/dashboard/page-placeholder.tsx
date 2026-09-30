"use client"

// Placeholder for sections under construction — keeps navigation working
// with a clean empty state.
import Link from "next/link"
import { ArrowRight, Construction } from "lucide-react"

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

      <div className="border-border/60 bg-card flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-20 text-center">
        <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
          <Construction className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="font-medium">Under construction</p>
          <p className="text-muted-foreground max-w-sm text-sm leading-6">
            This section will arrive with the next milestone (full tables with filters).
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href={backHref} />}>
          <ArrowRight aria-hidden data-icon="inline-start" />
          Back to overview
        </Button>
      </div>
    </div>
  )
}
