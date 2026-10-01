"use client"

// Categories page — the list is locked behind CATALOGUE_MANAGER (verified).
import { Lock } from "lucide-react"

import { Card, CardContent } from "@workspace/ui/components/card"

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-sm">Manage store categories</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="bg-warning/10 text-warning flex size-12 items-center justify-center rounded-full">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="max-w-md space-y-1.5">
            <p className="font-medium">Category list access is restricted</p>
            <p className="text-muted-foreground text-sm leading-6">
              The current account lacks the{" "}
              <span className="font-mono text-xs">CATALOGUE_MANAGER</span> permission the backend
              requires to read categories. Once it is granted, this page will show the full
              category tree.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
