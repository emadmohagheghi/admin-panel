"use client"

// Generic stacked-count bar chart for the backend's DateChart payloads
// (basket/order status moving windows), rendered with evilcharts
// (Apache ECharts). Every series stacks as absolute counts; an optional
// `stackForKey` splits series into side-by-side groups (order statuses:
// CANCELED over PENDING, COMPLETE over BEING_PROCESS). Without it all
// series share one stack (basket statuses).
// Data fetching lives in the thin wrappers; this component only renders.
import { useMemo, type ComponentProps } from "react"

import { Card } from "@workspace/ui/components/card"

import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart"
import { ErrorBanner } from "@/components/dashboard/error-banner"
import { ChartCard, ChartEmpty, ChartSkeleton } from "@/components/charts/chart-card"
import {
  buildSeriesConfig,
  chartDescription,
  resolveTitle,
  toDateRows,
  toDateSeries,
  type DateChartData,
} from "@/components/charts/date-chart-utils"

type MovingWindowBarChartProps = ComponentProps<typeof Card> & {
  chart: DateChartData | null | undefined
  fetching: boolean
  errorMessage?: string
  onRetry: () => void
  fallbackTitle: string
  /** Stack id per series key; omit to stack every series together. */
  stackForKey?: (key: string) => string
}

export function MovingWindowBarChart({
  chart,
  fetching,
  errorMessage,
  onRetry,
  fallbackTitle,
  stackForKey,
  className,
  ...props
}: MovingWindowBarChartProps) {
  const series = useMemo(() => (chart ? toDateSeries(chart) : []), [chart])
  const rows = useMemo(() => (chart ? toDateRows(chart, series) : []), [chart, series])
  const config = useMemo(() => buildSeriesConfig(series), [series])

  const title = resolveTitle(chart?.title, fallbackTitle)

  return (
    <ChartCard
      title={title}
      description={chart ? chartDescription(chart) : undefined}
      className={className}
      {...props}
    >
      {errorMessage && <ErrorBanner error={errorMessage} toastPrefix={title} onRetry={onRetry} />}
      {!errorMessage && (fetching && rows.length === 0 ? <ChartSkeleton /> : null)}
      {!errorMessage && !fetching && rows.length === 0 && <ChartEmpty />}
      {!errorMessage && rows.length > 0 && (
        <EChartsBarChart
          data={rows}
          config={config}
          xDataKey="x"
          stackType="stacked"
          animation={false}
          className="h-72 w-full"
        >
          <EChartsBarChart.Grid />
          <EChartsBarChart.XAxis dataKey="x" />
          <EChartsBarChart.YAxis />
          <EChartsBarChart.Tooltip />
          {series.length > 1 && <EChartsBarChart.Legend />}
          {series.map((s) => (
            <EChartsBarChart.Bar
              key={s.id}
              dataKey={s.id}
              stack={stackForKey?.(s.key)}
            />
          ))}
        </EChartsBarChart>
      )}
    </ChartCard>
  )
}
