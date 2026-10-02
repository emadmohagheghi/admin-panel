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
  type RowData,
  type SortingState,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { ErrorBanner } from "@/components/dashboard/error-banner"

/** Edge padding for the first/last column, matching the members-table design */
function edgePaddingClass(index: number, count: number): string {
  return cn(index === 0 && "ps-4", index === count - 1 && "pe-4")
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required module augmentation signature
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * Height of the loading placeholder for this column so skeleton rows are
     * exactly as tall as loaded rows (no layout jump when data arrives).
     * Default h-5 matches single-line cells; multi-line cells set their own.
     */
    skeletonClassName?: string
  }
}

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
  /** Total record count (shown in the pagination footer) */
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
      {onSearchChange && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            role="searchbox"
            aria-label={searchPlaceholder ?? "Search"}
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? "Search…"}
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 h-9 w-full max-w-xs rounded-lg border px-3 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3"
          />
        </div>
      )}

      <ErrorBanner error={error} onRetry={onRetry} toastPrefix="Failed to load data" />

      <div className="bg-card shadow-xs overflow-hidden rounded-xl border">
        <Table>
          {/* Screen-reader summary of what this table shows */}
          <caption className="sr-only">
            {loading ? "Loading data" : table.getRowModel().rows.length === 0 ? emptyMessage : `${data.length} rows`}
          </caption>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, headerIndex) => {
                  const sortable = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className={edgePaddingClass(headerIndex, headerGroup.headers.length)}
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
                          <span aria-hidden className="text-xs opacity-60">
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
                  {table.getAllLeafColumns().map((col, colIndex, cols) => (
                    <TableCell
                      key={col.id}
                      className={edgePaddingClass(colIndex, cols.length)}
                    >
                      <div
                        className={cn(
                          "flex items-center",
                          col.columnDef.meta?.skeletonClassName ?? "h-5",
                        )}
                      >
                        <Skeleton className="h-4 w-full max-w-28" aria-hidden />
                      </div>
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
                  {row.getVisibleCells().map((cell, cellIndex, cells) => (
                    <TableCell
                      key={cell.id}
                      className={edgePaddingClass(cellIndex, cells.length)}
                    >
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
          {loading ? (
            // Skeleton mirrors the loaded footer's heights (h-4 text / h-8 buttons)
            // so nothing jumps when data arrives.
            <>
              <Skeleton className="h-4 w-28" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {totalCount != null
                  ? `${totalCount.toLocaleString("en-US")} ${totalCount === 1 ? "row" : "rows"}`
                  : pageLabel}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pagination.onPrevious}
                  disabled={!pagination.hasPreviousPage}
                  aria-label="Go to previous page"
                >
                  <ChevronLeft aria-hidden data-icon="inline-start" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pagination.onNext}
                  disabled={!pagination.hasNextPage}
                  aria-label="Go to next page"
                >
                  Next
                  <ChevronRight aria-hidden data-icon="inline-end" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
