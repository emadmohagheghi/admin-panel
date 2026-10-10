"use client"

// Products page — real list now that the backend opened ProductType fields.
// Server-side title search (iContains verified live), server cursor pagination
// (backend caps first at 20), client-side skip-to-category filtering.
import { useMemo, useState } from "react"
import { useQuery } from "urql"
import { ImageIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import type { ColumnDef } from "@tanstack/react-table"
import { ProductsListDocument, type ProductsListQuery } from "@workspace/graphql"

import { DataTable } from "@/components/dashboard/data-table"
import { backendMediaProxyUrl } from "@/lib/backend-media"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { formatDateTime } from "@/lib/format"

type ProductNode = NonNullable<ProductsListQuery["products"]>["edges"][number]["node"]

const PAGE_SIZE = 20

function ImageCell({ url, title }: { url?: string | null; title: string }) {
  const proxied = backendMediaProxyUrl(url ?? undefined)
  return (
    <Avatar className="bg-muted size-9 rounded-lg">
      {proxied ? (
        <AvatarImage src={proxied} alt="" className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-muted rounded-lg">
        <ImageIcon className="text-muted-foreground size-4" aria-hidden />
      </AvatarFallback>
    </Avatar>
  )
}

function CategoryTags({ names }: { names: string[] }) {
  if (names.length === 0) return <span className="text-muted-foreground text-xs">—</span>
  const shown = names.slice(0, 2)
  const rest = names.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((n) => (
        <Badge key={n} variant="secondary" className="max-w-32 truncate font-medium">
          {n}
        </Badge>
      ))}
      {rest > 0 && (
        <span className="text-muted-foreground text-xs">+{rest}</span>
      )}
    </div>
  )
}

export default function ProductsPage() {
  const { cursor, canGoBack, goNext, goBack, page } = useCursorPagination()
  const [search, setSearch] = useState("")

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: ProductsListDocument,
    variables: {
      first: PAGE_SIZE,
      after: cursor,
      filters: search.trim() ? { title: { iContains: search.trim() } } : null,
    },
  })

  const products = useMemo(() => (data?.products?.edges ?? []).map((e) => e.node), [data])

  const columns = useMemo<ColumnDef<ProductNode, unknown>[]>(
    () => [
      {
        accessorFn: (row) => row.title,
        id: "product",
        header: "Product",
        meta: { skeletonClassName: "h-9" },
        cell: (ctx) => {
          const p = ctx.row.original
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <ImageCell url={p.medias?.edges?.[0]?.node?.image?.url} title={p.title} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-muted-foreground truncate font-mono text-xs">{p.slug}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorFn: (row) => row.productType?.title ?? "",
        id: "class",
        header: "Type",
        cell: (ctx) => (
          <span className="text-muted-foreground text-sm">
            {ctx.row.original.productType?.title ?? "—"}
          </span>
        ),
      },
      {
        id: "categories",
        header: "Categories",
        cell: (ctx) => (
          <CategoryTags names={ctx.row.original.categories.map((c) => c.name)} />
        ),
      },
      {
        accessorFn: (row) => row.variants?.totalCount ?? 0,
        id: "variants",
        header: "Variants",
        cell: (ctx) => (
          <span className="text-sm tabular-nums">{ctx.getValue() as number}</span>
        ),
      },
      {
        accessorKey: "isPublic",
        header: "Visibility",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "warning"}>
            {ctx.getValue() ? "Public" : "Hidden"}
          </Badge>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: (ctx) => (
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatDateTime(ctx.row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground text-sm">
          Store products — {data?.products?.totalCount?.toLocaleString("en-US") ?? "…"} total, server-side title search, 20-per-page cursor pagination.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={products}
        loading={fetching && !data}
        fetching={fetching}
        error={error ? error.message : null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
        emptyMessage={search.trim() ? `No products match “${search.trim()}”` : "No products yet"}
        pagination={{
          hasNextPage: data?.products?.pageInfo.hasNextPage ?? false,
          hasPreviousPage: canGoBack || (data?.products?.pageInfo.hasPreviousPage ?? false),
          page,
          onNext: () => {
            const end = data?.products?.pageInfo.endCursor
            if (end) goNext(end)
          },
          onPrevious: goBack,
        }}
        totalCount={data?.products?.totalCount ?? null}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title — server-side…"
      />
    </div>
  )
}
