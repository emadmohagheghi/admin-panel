"use client"

// Order statuses per bucket as grouped stacked columns
// (backend: orderStatusMovingWindow), rendered with evilcharts
// (Apache ECharts). Backend's grouping: CANCELED stacks over PENDING,
// COMPLETE over BEING_PROCESS — each group is one stack id so the pairs
// render side by side. Unknown future statuses get their own "other" stack.
import { useMemo, type ComponentProps } from "react"
import { useQuery } from "urql"

import { DateChartFieldsFragmentDoc, OrderStatusChartDocument, useFragment } from "@workspace/graphql"

import { Card } from "@workspace/ui/components/card"

import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart"
import { ErrorBanner } from "@/components/dashboard/error-banner"
import { ChartCard, ChartEmpty, ChartSkeleton } from "@/components/charts/chart-card"
import {
  buildSeriesConfig,
  chartDescription,
  orderStatusStackGroup,
  resolveTitle,
  toDateRows,
  toDateSeries,
} from "@/components/charts/date-chart-utils"

export function OrderStatusChart({ className, ...props }: ComponentProps<typeof Card>) {
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({ query: OrderStatusChartDocument })

  const chart = useFragment(DateChartFieldsFragmentDoc, data?.orderStatusMovingWindow)
  const series = useMemo(() => (chart ? toDateSeries(chart) : []), [chart])
  const rows = useMemo(() => (chart ? toDateRows(chart, series) : []), [chart, series])
  const config = useMemo(() => buildSeriesConfig(series), [series])
  const title = resolveTitle(chart?.title, "Order status")

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
          animation={false}
          className="h-72 w-full"
        >
          <EChartsBarChart.Grid />
          <EChartsBarChart.XAxis dataKey="x" />
          <EChartsBarChart.YAxis />
          <EChartsBarChart.Tooltip />
          {series.length > 1 && <EChartsBarChart.Legend />}
          {series.map((s) => (
            <EChartsBarChart.Bar key={s.id} dataKey={s.id} stack={orderStatusStackGroup(s.key)} />
          ))}
        </EChartsBarChart>
      )}
    </ChartCard>
  )
}
