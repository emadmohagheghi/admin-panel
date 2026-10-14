"use client"

// Order statuses per bucket as grouped stacked columns
// (backend: orderStatusMovingWindow). Backend's grouping: CANCELED stacks
// over PENDING, COMPLETE over BEING_PROCESS — each group is one stackId so
// the two pairs render side by side. Unknown future statuses get their own
// "other" stack instead of breaking the layout.
import { useMemo, type ComponentProps } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useQuery } from "urql"

import { DateChartFieldsFragmentDoc, OrderStatusChartDocument, useFragment } from "@workspace/graphql"

import { Card } from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart"

import { ErrorBanner } from "@/components/dashboard/error-banner"
import { formatChartAxisTick, formatChartTooltipDate, formatInteger } from "@/components/formater"
import { ChartCard, ChartEmpty, ChartSkeleton } from "@/components/charts/chart-card"
import {
  buildSeriesConfig,
  chartDescription,
  orderStatusStackGroup,
  toDateRows,
  toDateSeries,
} from "@/components/charts/date-chart-utils"

export function OrderStatusChart({ className, ...props }: ComponentProps<typeof Card>) {
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({ query: OrderStatusChartDocument })

  const chart = useFragment(DateChartFieldsFragmentDoc, data?.orderStatusMovingWindow)
  const series = useMemo(() => (chart ? toDateSeries(chart) : []), [chart])
  const rows = useMemo(() => (chart ? toDateRows(chart, series) : []), [chart, series])
  const config = useMemo(() => buildSeriesConfig(series), [series])
  const title = chart?.title || "Order status"

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
        <ChartContainer className="aspect-22/10 w-full" config={config}>
          <BarChart accessibilityLayer data={rows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="x"
              interval="preserveStartEnd"
              minTickGap={24}
              tickFormatter={(value) => formatChartAxisTick(String(value), rows.length)}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              allowDecimals={false}
              tick={{ className: "tabular-nums" }}
              tickLine={false}
              tickMargin={8}
              width={36}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="min-w-40"
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { x?: string } | undefined
                    return row?.x ? formatChartTooltipDate(row.x, "long") : ""
                  }}
                  formatter={(value) => formatInteger(Number(value) || 0)}
                />
              }
              cursor={false}
            />
            {series.map((s) => (
              <Bar
                key={s.id}
                dataKey={s.id}
                fill={s.color}
                stackId={orderStatusStackGroup(s.key)}
              />
            ))}
            {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}
