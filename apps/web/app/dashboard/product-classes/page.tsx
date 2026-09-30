"use client"

// Product classes table — server-side title filter, cursor pagination.
import { useMemo, useState } from "react"
import { useQuery } from "urql"
import type { ColumnDef } from "@tanstack/react-table"
import { ProductClassesListDocument, type ProductClassesListQuery } from "@workspace/graphql"

import { Badge } from "@workspace/ui/components/badge"
import { DataTable } from "@/components/dashboard/data-table"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { orDash } from "@/lib/format"

type ClassNode = NonNullable<ProductClassesListQuery["productClasses"]>["edges"][number]["node"]

const PAGE_SIZE = 20

export default function ProductClassesPage() {
  const { cursor, canGoBack, goNext, goBack, reset } = useCursorPagination()
  const [serverSearch, setServerSearch] = useState("")

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: ProductClassesListDocument,
    variables: {
      first: PAGE_SIZE,
      after: cursor,
      filters: serverSearch.trim() ? { title: { iContains: serverSearch.trim() } } : null,
    },
  })

  const classes = useMemo(() => (data?.productClasses?.edges ?? []).map((e) => e.node), [data])

  const columns = useMemo<ColumnDef<ClassNode, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: (ctx) => <span className="text-sm font-medium">{orDash(ctx.row.original.title)}</span>,
      },
      {
        accessorKey: "slug",
        header: "Slug",
        cell: (ctx) => (
          <span className="text-muted-foreground font-mono text-xs">{orDash(ctx.row.original.slug)}</span>
        ),
      },
      {
        accessorKey: "requireShipping",
        header: "Shipping",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "secondary"}>
            {ctx.getValue() ? "Required" : "None"}
          </Badge>
        ),
      },
      {
        accessorKey: "trackStock",
        header: "Stock",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "secondary"}>
            {ctx.getValue() ? "Tracked" : "Off"}
          </Badge>
        ),
      },
      {
        accessorKey: "abstract",
        header: "Abstract",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "warning" : "outline"}>
            {ctx.getValue() ? "Yes" : "No"}
          </Badge>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Product Classes</h1>
        <p className="text-muted-foreground text-sm">
          Product types — search runs server-side on title.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={classes}
        loading={fetching && !data}
        error={error ? error.message : null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
        emptyMessage={serverSearch ? "No classes match your search" : "No product classes yet"}
        pagination={{
          hasNextPage: data?.productClasses?.pageInfo.hasNextPage ?? false,
          hasPreviousPage: canGoBack || (data?.productClasses?.pageInfo.hasPreviousPage ?? false),
          onNext: () => {
            const end = data?.productClasses?.pageInfo.endCursor
            if (end) goNext(end)
          },
          onPrevious: goBack,
        }}
        totalCount={data?.productClasses?.totalCount ?? null}
        searchValue={serverSearch}
        onSearchChange={(v) => {
          setServerSearch(v)
          reset()
        }}
        searchPlaceholder="Search title…"
      />
    </div>
  )
}
