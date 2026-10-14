"use client"

// Basket status mix per bucket as 100% stacked bars
// (backend: basketStatusMovingWindow). Values are normalized to the bucket
// total so stacks always fill to 100%; the tooltip shows each share with its
// real count for that bucket.
import { useMemo, type ComponentProps } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useQuery } from "urql"

import { BasketStatusChartDocument, DateChartFieldsFragmentDoc, useFragment } from "@workspace/graphql"

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
  toDateSeries,
  type DateChartData,
  type DateRow,
} from "@/components/charts/date-chart-utils"

/** Counts live next to the plotted share under `<id>__count`. */
function toPercentRows(chart: DateChartData) {
  const series = toDateSeries(chart)
  const rows = (chart.buckets ?? []).map((b) => {
    const day = (b.start ?? "").slice(0, 10) || b.label || b.key
    const total = b.total ?? 0
    const row: DateRow = { x: day, total }
    for (const s of series) {
      const v = (b.points ?? []).find((p) => p.seriesKey === s.key)?.value ?? 0
      row[s.id] = total > 0 ? Math.round((v / total) * 1000) / 10 : 0
      row[`${s.id}__count`] = v
    }
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
  const title = chart?.title || "Basket status"

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
              domain={[0, 100]}
              tick={{ className: "tabular-nums" }}
              tickFormatter={(value) => `${Number(value)}%`}
              tickLine={false}
              tickMargin={8}
              width={44}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="min-w-44"
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as DateRow | undefined
                    return row?.x ? formatChartTooltipDate(row.x, "long") : ""
                  }}
                  formatter={(value, _name, item) => {
                    const seriesId = String(item?.dataKey ?? "")
                    const row = item?.payload as DateRow | undefined
                    const label = config[seriesId]?.label ?? seriesId
                    const pct = Number(value)
                    const count = Number(row?.[`${seriesId}__count`] ?? 0)
                    return [
                      `${Number.isFinite(pct) ? pct : 0}% (${formatInteger(count)})`,
                      label,
                    ]
                  }}
                />
              }
              cursor={false}
            />
            {series.map((s) => (
              <Bar key={s.id} dataKey={s.id} fill={s.color} stackId="mix" />
            ))}
            {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}
