"use client"

// Boolean-filter breakdown for the users page: counts from the backend's
// UserFilterStats query rendered as concentric rings (evilcharts / ECharts).
// Each row doubles as a filter toggle for the table below.
import { useMemo } from "react"
import { useQuery } from "urql"

import { UserFilterStatsDocument } from "@workspace/graphql"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import { ErrorBanner } from "@/components/dashboard/error-banner"
import {
  EChartsRadialChart,
  type ChartConfig,
} from "@/components/evilcharts/charts/echarts-radial-chart"

export type UserBooleanFilter =
  | "isActive"
  | "isConfirmed"
  | "isStaff"
  | "isSuperuser"

export type UserBooleanFilterState = Record<UserBooleanFilter, boolean | null>

type FilterCountKey = "active" | "confirmed" | "staff" | "superuser"

type UserBooleanFilterMeta = {
  key: UserBooleanFilter
  label: string
  countKey: FilterCountKey
  dotClassName: string
  colors: { light: [string]; dark: [string] }
}

// Same palette as the other dashboard charts (tailwind-500 light / 400 dark),
// passed to evilcharts as explicit light/dark pairs.
export const USER_BOOLEAN_FILTERS: readonly UserBooleanFilterMeta[] = [
  {
    key: "isActive",
    label: "Active",
    countKey: "active",
    dotClassName: "bg-emerald-500 dark:bg-emerald-400",
    colors: { light: ["#10b981"], dark: ["#34d399"] },
  },
  {
    key: "isConfirmed",
    label: "Confirmed",
    countKey: "confirmed",
    dotClassName: "bg-blue-500 dark:bg-blue-400",
    colors: { light: ["#3b82f6"], dark: ["#60a5fa"] },
  },
  {
    key: "isStaff",
    label: "Staff",
    countKey: "staff",
    dotClassName: "bg-amber-500 dark:bg-amber-400",
    colors: { light: ["#f59e0b"], dark: ["#fbbf24"] },
  },
  {
    key: "isSuperuser",
    label: "Superuser",
    countKey: "superuser",
    dotClassName: "bg-violet-500 dark:bg-violet-400",
    colors: { light: ["#8b5cf6"], dark: ["#a78bfa"] },
  },
]

const CHART_CONFIG: ChartConfig = Object.fromEntries(
  USER_BOOLEAN_FILTERS.map((filter) => [
    filter.key,
    { label: filter.label, colors: filter.colors },
  ])
)

function formatPercent(count: number, total: number): string {
  if (total <= 0) return "0%"
  const percent = (count / total) * 100
  if (percent > 0 && percent < 1) return "<1%"
  return `${Math.round(percent)}%`
}

type UserFiltersChartProps = {
  filters: UserBooleanFilterState
  onToggle: (key: UserBooleanFilter) => void
}

export function UserFiltersChart({ filters, onToggle }: UserFiltersChartProps) {
  const [{ data, fetching, error }, reexecute] = useQuery({
    query: UserFilterStatsDocument,
  })

  const total = data?.total.totalCount ?? 0
  const loading = fetching && !data

  const rows = useMemo(
    () =>
      USER_BOOLEAN_FILTERS.map((filter) => ({
        key: filter.key,
        count: data?.[filter.countKey].totalCount ?? 0,
      })),
    [data]
  )

  return (
    <ChartCard
      title="User breakdown"
      description="Click a row to filter the table."
    >
      {error ? (
        <ErrorBanner
          error={error.message}
          toastPrefix="Failed to load user breakdown"
          onRetry={() => reexecute({ requestPolicy: "network-only" })}
        />
      ) : !loading && total === 0 ? (
        <ChartEmpty message="No users yet" />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-64 w-full max-w-72 shrink-0">
            <EChartsRadialChart
              data={rows}
              config={CHART_CONFIG}
              nameKey="key"
              max={Math.max(total, 1)}
              isLoading={loading}
              innerRadius="34%"
              outerRadius="100%"
              className="h-full w-full"
            >
              <EChartsRadialChart.Tooltip />
              <EChartsRadialChart.RadialBar
                dataKey="count"
                barSize={12}
                cornerRadius={6}
                showBackground
              />
            </EChartsRadialChart>
            {!loading && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums">
                  {total.toLocaleString("en-US")}
                </span>
                <span className="text-xs text-muted-foreground">users</span>
              </div>
            )}
          </div>

          <ul className="grid w-full flex-1 content-center gap-2 sm:grid-cols-2">
            {USER_BOOLEAN_FILTERS.map((filter) => {
              const active = filters[filter.key] !== null
              const count = loading
                ? null
                : (data?.[filter.countKey].totalCount ?? 0)

              return (
                <li key={filter.key}>
                  {count === null ? (
                    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <Skeleton className="size-2.5 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="ms-auto h-4 w-10" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggle(filter.key)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "border-foreground/15 bg-muted"
                          : "border-transparent hover:bg-muted/50"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          filter.dotClassName
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {filter.label}
                      </span>
                      <span className="tabular-nums">
                        {count.toLocaleString("en-US")}
                      </span>
                      <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                        {formatPercent(count, total)}
                      </span>
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}
