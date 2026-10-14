"use client"

// Basket status mix per bucket as 100% stacked bars
// (backend: basketStatusMovingWindow), rendered with evilcharts
// (Apache ECharts). Shares are pre-normalized to whole percents summing to
// exactly 100 (largest remainder) so stacks always fill the axis.
import { useMemo, type ComponentProps } from "react"
import { useQuery } from "urql"

import { BasketStatusChartDocument, DateChartFieldsFragmentDoc, useFragment } from "@workspace/graphql"

import { Card } from "@workspace/ui/components/card"

import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart"
import { ErrorBanner } from "@/components/dashboard/error-banner"
import { ChartCard, ChartEmpty, ChartSkeleton } from "@/components/charts/chart-card"
import {
  buildSeriesConfig,
  chartDescription,
  exactPercentShares,
  resolveTitle,
  toDateSeries,
  type DateChartData,
  type DateRow,
} from "@/components/charts/date-chart-utils"

function toPercentRows(chart: DateChartData) {
  const series = toDateSeries(chart)
  const buckets = chart.buckets ?? []
  const rows = buckets.map((b) => {
    const day = (b.start ?? "").slice(0, 10) || b.label || b.key
    const values = series.map(
      (s) => (b.points ?? []).find((p) => p.seriesKey === s.key)?.value ?? 0,
    )
    const shares = exactPercentShares(values)
    const row: DateRow = {
      x: day,
      total: b.total ?? 0,
    }
    series.forEach((s, i) => {
      row[s.id] = shares[i] ?? 0
    })
    return row
  })
  return { rows, series }
}

export function BasketStatusChart({ className, ...props }: ComponentProps<typeof Card>) {
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({ query: BasketStatusChartDocument })

  const chart = useFragment(DateChartFieldsFragmentDoc, data?.basketStatusMovingWindow)
  const { rows, series } = useMemo(
    () => (chart ? toPercentRows(chart) : { rows: [] as DateRow[], series: [] as never[] }),
    [chart],
  )
  const config = useMemo(() => buildSeriesConfig(series), [series])
  const title = resolveTitle(chart?.title, "Basket status")

  return (
    <ChartCard
      title={title}
      description={chart ? chartDescription(chart) : undefined}
      className={className}
      {...props}
    >
      {error && (
        <ErrorBanner
          error={error.message}
          toastPrefix={title}
          onRetry={() => reexecuteQuery({ requestPolicy: "network-only" })}
        />
      )}
      {!error && (fetching && rows.length === 0 ? <ChartSkeleton /> : null)}
      {!error && !fetching && rows.length === 0 && <ChartEmpty />}
      {!error && rows.length > 0 && (
        <EChartsBarChart
          data={rows}
          config={config}
          xDataKey="x"
          stackType="stacked"
          className="h-72 w-full"
        >
          <EChartsBarChart.Grid />
          <EChartsBarChart.XAxis dataKey="x" />
          <EChartsBarChart.YAxis tickFormatter={(value) => `${Number(value)}%`} />
          <EChartsBarChart.Tooltip />
          {series.length > 1 && <EChartsBarChart.Legend />}
          {series.map((s) => (
            <EChartsBarChart.Bar key={s.id} dataKey={s.id} />
          ))}
        </EChartsBarChart>
      )}
    </ChartCard>
  )
}
