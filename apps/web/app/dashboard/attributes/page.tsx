"use client"

// جدول ویژگی‌ها — فیلتر سروری name (iContains)، صفحه‌بندی cursor.
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

/** برچسب فارسی برای enum ورودی ویژگی */
const INPUT_TYPE_LABELS: Record<string, string> = {
  dropdown: "کرکره‌ای",
  multiselect: "چندانتخابی",
  file: "فایل",
  reference: "ارجاع",
  single_reference: "ارجاع تکی",
  numeric: "عددی",
  rich_text: "متن غنی",
  plain_text: "متن ساده",
  swatch: "سواچ رنگ",
  boolean: "بله/خیر",
  date: "تاریخ",
  date_time: "تاریخ و ساعت",
}

/** برچسب فارسی واحدها */
const UNIT_LABELS: Record<string, string> = {
  MM: "میلی‌متر",
  CM: "سانتی‌متر",
  DM: "دسی‌متر",
  M: "متر",
  KM: "کیلومتر",
  INCH: "اینچ",
  G: "گرم",
  LB: "پوند",
  OZ: "اونس",
  KG: "کیلوگرم",
  SQ_MM: "میلی‌متر مربع",
  SQ_CM: "سانتی‌متر مربع",
  SQ_DM: "دسی‌متر مربع",
  SQ_M: "متر مربع",
  SQ_INCH: "اینچ مربع",
}

export default function AttributesPage() {
  const { cursor, canGoBack, goNext, goBack } = useCursorPagination()
  // نکته: AttributeFilter فیلد name ندارد (محدودیت اسکیما) — جستجو کلاینت‌ساید است
  const [search, setSearch] = useState("")

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: AttributesListDocument,
    variables: {
      first: PAGE_SIZE,
      after: cursor,
      filters: null,
    },
  })

  const attributes = useMemo(
    () => (data?.attributes?.edges ?? []).map((e) => e.node),
    [data],
  )

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
        header: "نام",
        cell: (ctx) => <span className="text-sm font-medium">{orDash(ctx.row.original.name)}</span>,
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
        accessorKey: "inputType",
        header: "نوع ورودی",
        cell: (ctx) => {
          const key = String(ctx.getValue() ?? "")
          return <Badge variant="outline">{INPUT_TYPE_LABELS[key] ?? key}</Badge>
        },
      },
      {
        accessorKey: "unit",
        header: "واحد",
        cell: (ctx) => {
          const key = ctx.getValue() == null ? null : String(ctx.getValue())
          return (
            <span className="text-muted-foreground text-xs">
              {key ? (UNIT_LABELS[key] ?? key) : "—"}
            </span>
          )
        },
      },
      {
        accessorKey: "valueRequired",
        header: "الزامی",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "warning" : "outline"}>
            {ctx.getValue() ? "الزامی" : "اختیاری"}
          </Badge>
        ),
      },
      {
        accessorKey: "variantOnly",
        header: "فقط واریانت",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "secondary" : "outline"}>
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
        <h1 className="text-2xl font-bold tracking-tight">ویژگی‌ها</h1>
        <p className="text-muted-foreground text-sm">
          ویژگی‌های قابل‌انتساب به محصولات — جستجو سروری روی نام اعمال می‌شود.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={fetching && !data}
        error={error ? error.message : null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
        emptyMessage={search ? "ویژگی‌ای مطابق جستجو پیدا نشد" : "هنوز ویژگی‌ای ثبت نشده"}
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
        searchPlaceholder="جستجوی نام یا نامک…"
      />
    </div>
  )
}
