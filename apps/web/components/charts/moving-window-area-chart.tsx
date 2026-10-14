"use client"

// Generic datetime area chart for the backend's DateChart payloads
// (userJoined / completeOrder moving windows). Series and buckets are fully
// dynamic — one Area per series entry, colors cycled from the theme palette.
// Data fetching lives in the thin wrappers; this component only renders.
import { useId, useMemo, type ComponentProps } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card } from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart"

import { ErrorBanner } from "@/components/dashboard/error-banner"
import { ChartCard, ChartEmpty, ChartSkeleton } from "@/components/charts/chart-card"
import {
  buildSeriesConfig,
  chartDescription,
  chartTooltipLabel,
  formatBucketTick,
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
  const uid = useId().replace(/:/g, "")

  const series = useMemo(() => (chart ? toDateSeries(chart) : []), [chart])
  const rows = useMemo(() => (chart ? toDateRows(chart, series) : []), [chart, series])
  const config = useMemo(() => buildSeriesConfig(series), [series])

  const title = resolveTitle(chart?.title, fallbackTitle)
  const granularity = chart?.granularity ?? "DAY"

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
        <ChartContainer className="aspect-22/8 w-full" config={config}>
          <AreaChart accessibilityLayer data={rows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient id={`${uid}-${s.id}`} key={s.id} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
                  <stop offset="55%" stopColor={s.color} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="x"
              interval="preserveStartEnd"
              minTickGap={24}
              tickFormatter={(value) => formatBucketTick(String(value), granularity, rows.length)}
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
                  className="min-w-34"
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { x?: string; end?: string } | undefined
                    return chart ? chartTooltipLabel(chart, { x: row?.x ?? "", end: row?.end }) : ""
                  }}
                />
              }
              cursor={false}
            />
            {series.map((s) => (
              <Area
                key={s.id}
                dataKey={s.id}
                dot={false}
                fill={`url(#${uid}-${s.id})`}
                stroke={s.color}
                strokeWidth={2}
                type="natural"
              />
            ))}
            {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
          </AreaChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}
