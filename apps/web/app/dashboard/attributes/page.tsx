"use client"

// Attributes table — client-side search (AttributeFilter has no name field),
// cursor pagination.
import { useMemo, useState } from "react"
import { useQuery } from "urql"
import type { ColumnDef } from "@tanstack/react-table"
import { AttributesListDocument, type AttributesListQuery } from "@workspace/graphql"

import { Badge } from "@workspace/ui/components/badge"
import { DataTable } from "@/components/dashboard/data-table"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { orDash } from "@/lib/format"

type AttributeNode = NonNullable<AttributesListQuery["attributes"]>["edges"][number]["node"]

const PAGE_SIZE = 20

/** Human labels for the attribute input-type enum */
const INPUT_TYPE_LABELS: Record<string, string> = {
  dropdown: "Dropdown",
  multiselect: "Multiselect",
  file: "File",
  reference: "Reference",
  single_reference: "Single reference",
  numeric: "Numeric",
  rich_text: "Rich text",
  plain_text: "Plain text",
  swatch: "Swatch",
  boolean: "Boolean",
  date: "Date",
  date_time: "Date & time",
}

/** Human labels for units */
const UNIT_LABELS: Record<string, string> = {
  MM: "mm",
  CM: "cm",
  DM: "dm",
  M: "m",
  KM: "km",
  INCH: "in",
  G: "g",
  LB: "lb",
  OZ: "oz",
  KG: "kg",
  SQ_MM: "mm²",
  SQ_CM: "cm²",
  SQ_DM: "dm²",
  SQ_M: "m²",
  SQ_INCH: "in²",
}

export default function AttributesPage() {
  const { cursor, canGoBack, goNext, goBack } = useCursorPagination()
  // Note: AttributeFilter has no `name` field (schema limitation) — client-side search
  const [search, setSearch] = useState("")

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: AttributesListDocument,
    variables: {
      first: PAGE_SIZE,
      after: cursor,
      filters: null,
    },
  })

  const attributes = useMemo(() => (data?.attributes?.edges ?? []).map((e) => e.node), [data])

  const filtered = useMemo(() => {
    if (!search.trim()) return attributes
    const q = search.trim().toLowerCase()
    return attributes.filter(
      (a) => a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q),
    )
  }, [attributes, search])

  const columns = useMemo<ColumnDef<AttributeNode, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: (ctx) => <span className="text-sm font-medium">{orDash(ctx.row.original.name)}</span>,
      },
      {
        accessorKey: "slug",
        header: "Slug",
        cell: (ctx) => (
          <span className="text-muted-foreground font-mono text-xs">{orDash(ctx.row.original.slug)}</span>
        ),
      },
      {
        accessorKey: "inputType",
        header: "Input type",
        cell: (ctx) => {
          const key = String(ctx.getValue() ?? "")
          return <Badge variant="outline">{INPUT_TYPE_LABELS[key] ?? key}</Badge>
        },
      },
      {
        accessorKey: "unit",
        header: "Unit",
        cell: (ctx) => {
          const key = ctx.getValue() == null ? null : String(ctx.getValue())
          return <span className="text-muted-foreground text-xs">{key ? (UNIT_LABELS[key] ?? key) : "—"}</span>
        },
      },
      {
        accessorKey: "valueRequired",
        header: "Required",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "warning" : "outline"}>
            {ctx.getValue() ? "Required" : "Optional"}
          </Badge>
        ),
      },
      {
        accessorKey: "variantOnly",
        header: "Variant only",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "secondary" : "outline"}>
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
        <h1 className="text-2xl font-bold tracking-tight">Attributes</h1>
        <p className="text-muted-foreground text-sm">
          Attributes assignable to products — search applies to the current page.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={fetching && !data}
        error={error ? error.message : null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
        emptyMessage={search ? "No attributes match your search" : "No attributes yet"}
        pagination={{
          hasNextPage: data?.attributes?.pageInfo.hasNextPage ?? false,
          hasPreviousPage: canGoBack || (data?.attributes?.pageInfo.hasPreviousPage ?? false),
          onNext: () => {
            const end = data?.attributes?.pageInfo.endCursor
            if (end) goNext(end)
          },
          onPrevious: goBack,
        }}
        totalCount={data?.attributes?.totalCount ?? null}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name or slug (current page)…"
      />
    </div>
  )
}
