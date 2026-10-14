"use client"

// Generic datetime area chart for the backend's DateChart payloads
// (userJoined / completeOrder moving windows), rendered with evilcharts
// (Apache ECharts). Series and buckets are fully dynamic — one Area per
// series entry, colors resolved through the evilcharts ChartConfig.
// Data fetching lives in the thin wrappers; this component only renders.
import { useMemo, type ComponentProps } from "react"

import { Card } from "@workspace/ui/components/card"

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart"
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

type MovingWindowAreaChartProps = ComponentProps<typeof Card> & {
  chart: DateChartData | null | undefined
  fetching: boolean
  errorMessage?: string
  onRetry: () => void
  fallbackTitle: string
}

export function MovingWindowAreaChart({
  chart,
  fetching,
  errorMessage,
  onRetry,
  fallbackTitle,
  className,
  ...props
}: MovingWindowAreaChartProps) {
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
        <EChartsAreaChart
          data={rows}
          config={config}
          xDataKey="x"
          curveType="natural"
          animation={false}
          className="h-72 w-full"
        >
          <EChartsAreaChart.Grid />
          <EChartsAreaChart.XAxis dataKey="x" />
          <EChartsAreaChart.YAxis />
          <EChartsAreaChart.Tooltip />
          {series.length > 1 && <EChartsAreaChart.Legend />}
          {series.map((s) => (
            <EChartsAreaChart.Area key={s.id} dataKey={s.id} variant="gradient" />
          ))}
        </EChartsAreaChart>
      )}
    </ChartCard>
  )
}
