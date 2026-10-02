"use client"

// Variants table — server-side sku filter, cursor pagination.
import { useMemo, useState } from "react"
import { useQuery } from "urql"
import type { ColumnDef } from "@tanstack/react-table"
import { VariantsListDocument, type VariantsListQuery } from "@workspace/graphql"

import { Badge } from "@workspace/ui/components/badge"
import { DataTable } from "@/components/dashboard/data-table"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { formatDateTime, orDash } from "@/lib/format"

type VariantNode = NonNullable<VariantsListQuery["variants"]>["edges"][number]["node"]

const PAGE_SIZE = 20

export default function VariantsPage() {
  const { cursor, canGoBack, goNext, goBack, reset, page } = useCursorPagination()
  const [serverSearch, setServerSearch] = useState("")

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: VariantsListDocument,
    variables: {
      first: PAGE_SIZE,
      after: cursor,
      // Server-side filter: sku with iContains (case-insensitive)
      filters: serverSearch.trim() ? { sku: { iContains: serverSearch.trim() } } : null,
    },
  })

  const variants = useMemo(() => (data?.variants?.edges ?? []).map((e) => e.node), [data])

  const columns = useMemo<ColumnDef<VariantNode, unknown>[]>(
    () => [
      {
        accessorKey: "sku",
        header: "SKU",
        cell: (ctx) => (
          <span className="font-mono text-xs font-medium">{orDash(ctx.row.original.sku)}</span>
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: (ctx) => <span className="text-sm">{orDash(ctx.row.original.name)}</span>,
      },
      {
        accessorKey: "trackInventory",
        header: "Track inventory",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "secondary"}>
            {ctx.getValue() ? "On" : "Off"}
          </Badge>
        ),
      },
      {
        accessorKey: "sortOrder",
        header: "Order",
        cell: (ctx) => (
          <span className="text-muted-foreground tabular-nums text-xs">{orDash(ctx.row.original.sortOrder)}</span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: (ctx) => (
          <span className="text-muted-foreground text-xs">{formatDateTime(ctx.row.original.updatedAt)}</span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Variants</h1>
        <p className="text-muted-foreground text-sm">
          Product variants — search runs server-side on SKU.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={variants}
        loading={fetching && !data}
        fetching={fetching}
        error={error ? error.message : null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
        emptyMessage={serverSearch ? "No variants match your search" : "No variants yet"}
        pagination={{
          hasNextPage: data?.variants?.pageInfo.hasNextPage ?? false,
          hasPreviousPage: canGoBack || (data?.variants?.pageInfo.hasPreviousPage ?? false),
          page,
          onNext: () => {
            const end = data?.variants?.pageInfo.endCursor
            if (end) goNext(end)
          },
          onPrevious: goBack,
        }}
        totalCount={data?.variants?.totalCount ?? null}
        searchValue={serverSearch}
        onSearchChange={(v) => {
          setServerSearch(v)
          reset()
        }}
        searchPlaceholder="Search SKU…"
      />
    </div>
  )
}
