"use client"

// جدول کلاس‌های محصول — فیلتر سروری title (iContains)، صفحه‌بندی cursor.
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

  const classes = useMemo(
    () => (data?.productClasses?.edges ?? []).map((e) => e.node),
    [data],
  )

  const columns = useMemo<ColumnDef<ClassNode, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "عنوان",
        cell: (ctx) => <span className="text-sm font-medium">{orDash(ctx.row.original.title)}</span>,
      },
      {
        accessorKey: "slug",
        header: "نامک",
        cell: (ctx) => (
          <span dir="ltr" className="text-muted-foreground font-mono text-xs">
            {orDash(ctx.row.original.slug)}
          </span>
        ),
      },
      {
        accessorKey: "requireShipping",
        header: "ارسال",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "secondary"}>
            {ctx.getValue() ? "نیازمند" : "بدون"}
          </Badge>
        ),
      },
      {
        accessorKey: "trackStock",
        header: "موجودی",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "secondary"}>
            {ctx.getValue() ? "ردیابی" : "بدون"}
          </Badge>
        ),
      },
      {
        accessorKey: "abstract",
        header: "انتزاعی",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "warning" : "outline"}>
            {ctx.getValue() ? "بله" : "خیر"}
          </Badge>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">کلاس‌های محصول</h1>
        <p className="text-muted-foreground text-sm">
          انواع محصولات — جستجو سروری روی عنوان اعمال می‌شود.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={classes}
        loading={fetching && !data}
        error={error ? error.message : null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
        emptyMessage={serverSearch ? "کلاسی مطابق جستجو پیدا نشد" : "هنوز کلاسی ثبت نشده"}
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
        searchPlaceholder="جستجوی عنوان…"
      />
    </div>
  )
}
