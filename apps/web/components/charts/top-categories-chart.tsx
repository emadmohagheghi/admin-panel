"use client"

// Top ten categories as horizontal bars with value labels
// (backend: topTenCategoriesChart → SimpleChart.lines of label/num),
// rendered with evilcharts (Apache ECharts).
import { useMemo, type ComponentProps } from "react"
import { useQuery } from "urql"

import { TopCategoriesChartDocument } from "@workspace/graphql"

import { Card } from "@workspace/ui/components/card"

import { EChartsBarChart, type ChartConfig } from "@/components/evilcharts/charts/echarts-bar-chart"
import { ErrorBanner } from "@/components/dashboard/error-banner"
import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import { CHART_ACCENT, resolveTitle } from "@/components/charts/date-chart-utils"

const chartConfig = {
  num: {
    label: "Count",
    colors: { light: [CHART_ACCENT.light], dark: [CHART_ACCENT.dark] },
  },
} satisfies ChartConfig

export function TopCategoriesChart({ className, ...props }: ComponentProps<typeof Card>) {
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({ query: TopCategoriesChartDocument })

  const chart = data?.topTenCategoriesChart ?? null
  const rows = useMemo(
    () => (chart?.lines ?? []).map((line) => ({ label: line.label, num: line.num })),
    [chart],
  )
  const title = resolveTitle(chart?.title, "Top categories")
  const loading = fetching && rows.length === 0

  return (
    <ChartCard title={title} description="Top 10 categories" className={className} {...props}>
      {error && (
        <ErrorBanner
          error={error.message}
          toastPrefix={title}
          onRetry={() => reexecuteQuery({ requestPolicy: "network-only" })}
        />
      )}
      {!error && !loading && rows.length === 0 && <ChartEmpty />}
      {!error && (loading || rows.length > 0) && (
        <EChartsBarChart
          data={rows}
          config={chartConfig}
          xDataKey="label"
          layout="horizontal"
          isLoading={loading}
          gridRight={44}
          className="h-80 w-full"
        >
          <EChartsBarChart.Grid />
          <EChartsBarChart.YAxis dataKey="label" />
          <EChartsBarChart.Tooltip />
          <EChartsBarChart.Bar dataKey="num" showValues isClickable />
        </EChartsBarChart>
      )}
    </ChartCard>
  )
}
