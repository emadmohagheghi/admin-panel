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
import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import {
  aggregateWeekly,
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
  /**
   * Bucket aggregation: "auto" aggregates dense daily windows into weekly
   * sums, "weekly" forces it, "daily" always shows raw buckets.
   */
  aggregate?: "auto" | "weekly" | "daily"
}

// Static frame children are module constants on purpose: evilcharts rebuilds
// and re-pushes its option whenever the children identity changes, which would
// snap a running entrance reveal to its final state on every unrelated parent
// re-render (e.g. a sibling query resolving). Only series-driven nodes below
// are recreated, and only when the series actually change.
const AREA_FRAME = (
  <>
    <EChartsAreaChart.Grid />
    <EChartsAreaChart.XAxis dataKey="x" />
    <EChartsAreaChart.YAxis />
    <EChartsAreaChart.Tooltip />
  </>
)
const AREA_LEGEND = <EChartsAreaChart.Legend />
const AREA_BRUSH = <EChartsAreaChart.Brush />

export function MovingWindowAreaChart({
  chart,
  fetching,
  errorMessage,
  onRetry,
  fallbackTitle,
  aggregate = "auto",
  className,
  ...props
}: MovingWindowAreaChartProps) {
  const aggregatedView = useMemo(() => {
    if (!chart || aggregate === "daily") return null
    return aggregateWeekly(chart)
  }, [chart, aggregate])
  const view = aggregatedView ?? chart
  const series = useMemo(() => (view ? toDateSeries(view) : []), [view])
  const rows = useMemo(() => (view ? toDateRows(view, series) : []), [view, series])
  const config = useMemo(() => buildSeriesConfig(series), [series])
  const areaNodes = useMemo(
    () =>
      series.map((s) => (
        <EChartsAreaChart.Area key={s.id} dataKey={s.id} variant="gradient" strokeVariant="solid" />
      )),
    [series],
  )

  const title = resolveTitle(chart?.title, fallbackTitle)
  const loading = fetching && rows.length === 0
  const description = chart
    ? aggregatedView
      ? `${aggregatedView.buckets.length} weeks · per week`
      : chartDescription(chart)
    : undefined

  return (
    <ChartCard
      title={title}
      description={description}
      className={className}
      {...props}
    >
      {errorMessage && <ErrorBanner error={errorMessage} toastPrefix={title} onRetry={onRetry} />}
      {!errorMessage && !loading && rows.length === 0 && <ChartEmpty />}
      {!errorMessage && (loading || rows.length > 0) && (
        <EChartsAreaChart
          data={rows}
          config={config}
          xDataKey="x"
          curveType="natural"
          className="h-72 w-full"
          isLoading={loading}
        >
          {AREA_FRAME}
          {rows.length > 31 && AREA_BRUSH}
          {series.length > 1 && AREA_LEGEND}
          {areaNodes}
        </EChartsAreaChart>
      )}
    </ChartCard>
  )
}
