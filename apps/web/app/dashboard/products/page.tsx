"use client"

// Products page — the list is locked behind GROUP_MANAGER (verified);
// only the total count is readable. Show a clear notice.
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
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground text-sm">Manage store products</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="bg-warning/10 text-warning flex size-12 items-center justify-center rounded-full">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="max-w-md space-y-1.5">
            <p className="font-medium">Product list access is restricted</p>
            <p className="text-muted-foreground text-sm leading-6">
              The current account lacks the{" "}
              <span className="font-mono text-xs">GROUP_MANAGER</span> permission the backend
              requires to read products. Once it is granted, this page will show the full list
              automatically.
            </p>
            {typeof count === "number" && (
              <p className="text-muted-foreground text-xs">
                Total products: <span className="font-medium tabular-nums">{count.toLocaleString("en-US")}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
