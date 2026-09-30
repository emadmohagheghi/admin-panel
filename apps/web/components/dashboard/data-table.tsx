"use client"

// Generic data table — TanStack Table + loading/error/empty states + cursor pagination.
// Keep the structure clean (Tailwind classes only, no inline styles) so motion
// wrappers can be added later.
import { useState } from "react"
import {
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { ErrorBanner } from "@/components/dashboard/error-banner"

export type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  /** Initial or background loading state */
  loading: boolean
  error?: string | null
  onRetry?: () => void
  /** Empty state message */
  emptyMessage: string
  /** Cursor pagination (when the server paginates data) */
  pagination?: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    onNext: () => void
    onPrevious: () => void
  }
  /** Page label to display (optional) */
  pageLabel?: string
  /** Total record count (shown next to the search box) */
  totalCount?: number | null
  /** Client-side search (current page only) */
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyMessage,
  pagination,
  pageLabel,
  totalCount,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  // React Compiler skips memoizing this component (react-hooks/incompatible-library)
  // — harmless: the table manages its own internal state.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
    manualPagination: true,
    manualFiltering: true,
  })

  return (
    <div className="space-y-3">
      {(onSearchChange || totalCount != null) && (
        <div className="flex flex-wrap items-center gap-3">
          {onSearchChange && (
            <input
              type="search"
              role="searchbox"
              aria-label={searchPlaceholder ?? "Search"}
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder ?? "Search…"}
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 h-9 w-full max-w-xs rounded-lg border px-3 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3"
            />
          )}
          {totalCount != null && (
            <span className="text-muted-foreground text-xs tabular-nums">
              Total: {totalCount.toLocaleString("en-US")}
            </span>
          )}
        </div>
      )}

      <ErrorBanner error={error} onRetry={onRetry} toastPrefix="Failed to load data" />

      <div className="border-border/60 overflow-hidden rounded-xl border">
        <Table>
          {/* Screen-reader summary of what this table shows */}
          <caption className="sr-only">
            {loading ? "Loading data" : table.getRowModel().rows.length === 0 ? emptyMessage : `${data.length} rows`}
          </caption>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                      }
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="hover:text-foreground flex w-full items-center gap-1 outline-none"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span aria-hidden className="text-[10px] opacity-60">
                            {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </tr>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 8 }, (_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {table.getAllLeafColumns().map((col) => (
                    <TableCell key={col.id}>
                      <div
                        className="bg-muted h-4 w-full max-w-28 animate-pulse rounded"
                        aria-hidden
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40">
                  <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 text-center">
                    <Inbox className="size-8 opacity-40" aria-hidden />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">
            {pageLabel ?? "Server-side cursor pagination"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onPrevious}
              disabled={!pagination.hasPreviousPage || loading}
              aria-label={loading ? "Loading…" : "Go to previous page"}
            >
              <ChevronLeft aria-hidden data-icon="inline-start" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onNext}
              disabled={!pagination.hasNextPage || loading}
              aria-label={loading ? "Loading…" : "Go to next page"}
            >
              Next
              <ChevronRight aria-hidden data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
