"use client"

// Top ten categories as horizontal bars with value labels
// (backend: topTenCategoriesChart → SimpleChart.lines of label/num).
import { useMemo, type ComponentProps } from "react"
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"
import { useQuery } from "urql"

import { TopCategoriesChartDocument } from "@workspace/graphql"

import { Card } from "@workspace/ui/components/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart"

import { ErrorBanner } from "@/components/dashboard/error-banner"
import { formatInteger } from "@/components/formater"
import { ChartCard, ChartEmpty, ChartSkeleton } from "@/components/charts/chart-card"
import { resolveTitle } from "@/components/charts/date-chart-utils"

const chartConfig = {
  num: {
    label: "Count",
    color: "oklch(0.62 0.19 255)",
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

  return (
    <ChartCard title={title} description="Top 10 categories" className={className} {...props}>
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
        <ChartContainer className="h-80 w-full" config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={rows}
            layout="vertical"
            margin={{ left: 8, right: 48, top: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              axisLine={false}
              dataKey="label"
              tickLine={false}
              tickMargin={8}
              type="category"
              width={120}
            />
            <ChartTooltip
              content={<ChartTooltipContent className="min-w-36" indicator="line" />}
              cursor={false}
            />
            <Bar dataKey="num" fill="var(--color-num)" radius={[0, 6, 6, 0]}>
              <LabelList
                className="fill-foreground font-medium tabular-nums"
                dataKey="num"
                fontWeight={500}
                formatter={(label) => formatInteger(Number(label) || 0)}
                position="right"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}
