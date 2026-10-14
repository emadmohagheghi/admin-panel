// Shared helpers for the backend-driven dashboard charts (DateChart/SimpleChart).
// A DateChart carries `series` (key/label pairs) plus `buckets`; each bucket
// holds `points` that join back to a series via `seriesKey`. Series keys come
// from the backend (status names etc.) so everything here stays dynamic:
// dataKeys are safe synthetic ids (`s0`, `s1`, …) while labels/colors resolve
// through the shadcn ChartConfig.
import type { ChartConfig } from "@workspace/ui/components/chart"
import type { DateChartFieldsFragment } from "@workspace/graphql"

export type DateChartData = DateChartFieldsFragment

export type DateSeries = {
  /** Safe synthetic dataKey used in recharts (`s0`, …) */
  id: string
  /** Backend series key (e.g. an order status) */
  key: string
  label: string
  color: string
}

export type DateRow = {
  /** ISO day (`YYYY-MM-DD`) derived from the bucket start — axis value */
  x: string
  total: number
} & Record<string, number | string>

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function toDateSeries(chart: DateChartData): DateSeries[] {
  return (chart.series ?? []).map((s, i) => ({
    id: `s${i}`,
    key: s.key,
    label: s.label || s.key,
    color: PALETTE[i % PALETTE.length] ?? "var(--chart-1)",
  }))
}

/** Buckets → recharts rows. Missing series points default to 0. */
export function toDateRows(chart: DateChartData, series: DateSeries[]): DateRow[] {
  return (chart.buckets ?? []).map((b) => {
    const day = (b.start ?? "").slice(0, 10) || b.label || b.key
    const values = new Map((b.points ?? []).map((p) => [p.seriesKey, p.value]))
    const row: DateRow = { x: day, total: b.total ?? 0 }
    for (const s of series) row[s.id] = values.get(s.key) ?? 0
    return row
  })
}

export function buildSeriesConfig(series: DateSeries[]): ChartConfig {
  const config: ChartConfig = {}
  for (const s of series) config[s.id] = { label: s.label, color: s.color }
  return config
}

export function granularityNoun(granularity: string): string {
  switch (granularity) {
    case "DAY":
      return "day"
    case "WEEK":
      return "week"
    case "MONTH":
      return "month"
    default:
      return "period"
  }
}

export function chartDescription(chart: DateChartData): string {
  const n = chart.buckets?.length ?? 0
  const noun = granularityNoun(chart.granularity)
  return `${n} ${noun}${n === 1 ? "" : "s"} · per ${noun}`
}

/**
 * Stack group for the order-status grouped chart (backend's request: CANCELED
 * over PENDING, COMPLETE over BEING_PROCESS). Keys are normalized before
 * matching so `BEING_PROCESS`, `being process`, `BeingProcess` all land in
 * the same group; unknown future statuses fall into their own "other" stack.
 */
export function orderStatusStackGroup(key: string): string {
  const k = key.toLowerCase().replace(/[\s_-]+/g, "")
  if (k.includes("cancel") || k.includes("pending")) return "pending"
  if (k.includes("complet") || k.includes("being") || k.includes("process")) return "processing"
  return "other"
}
