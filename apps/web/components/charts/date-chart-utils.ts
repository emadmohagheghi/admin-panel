// Shared helpers for the backend-driven dashboard charts (DateChart/SimpleChart).
// A DateChart carries `series` (key/label pairs) plus `buckets`; each bucket
// holds `points` that join back to a series via `seriesKey`. Series keys come
// from the backend (status names etc.) so everything here stays dynamic:
// dataKeys are safe synthetic ids (`s0`, `s1`, …) while labels/colors resolve
// through the shadcn ChartConfig.
import type { ChartConfig } from "@workspace/ui/components/chart"
import type { DateChartFieldsFragment } from "@workspace/graphql"

import { DASHBOARD_LOCALE, formatChartAxisTick, formatChartTooltipDate, formatDate } from "@/components/formater"

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
  /** ISO day of the bucket end (for WEEK/MONTH range tooltips) */
  end: string
  total: number
} & Record<string, number | string>

// The app theme is intentionally monochrome (all --chart-* are chroma 0),
// which renders every series in gray. Charts need distinguishable series, so
// they carry their own categorical palette (oklch hues readable in both
// light and dark mode) plus semantic colors for known status keys.
const BLUE = "oklch(0.62 0.19 255)"
const VIOLET = "oklch(0.62 0.2 305)"
const AMBER = "oklch(0.74 0.16 80)"
const CYAN = "oklch(0.7 0.14 195)"
const RED = "oklch(0.63 0.2 25)"
const GREEN = "oklch(0.68 0.16 160)"

const CATEGORY_PALETTE = [BLUE, VIOLET, AMBER, CYAN, RED, GREEN]

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "")
}

/** Semantic color for known status keys; null when the key is unfamiliar. */
function semanticColor(key: string): string | null {
  const k = normalizeKey(key)
  if (k.includes("cancel")) return RED
  if (k.includes("pending")) return AMBER
  if (k.includes("complet") || k.includes("submit")) return GREEN
  if (k.includes("being") || k.includes("process")) return BLUE
  if (k.includes("open")) return BLUE
  if (k.includes("merg")) return VIOLET
  if (k.includes("sav")) return AMBER
  if (k.includes("froz")) return CYAN
  return null
}

export function colorForSeriesKey(key: string, index: number): string {
  return semanticColor(key) ?? CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] ?? BLUE
}

export function toDateSeries(chart: DateChartData): DateSeries[] {
  return (chart.series ?? []).map((s, i) => ({
    id: `s${i}`,
    key: s.key,
    label: s.label || s.key,
    color: colorForSeriesKey(s.key, i),
  }))
}

/** Buckets → recharts rows. Missing series points default to 0. */
export function toDateRows(chart: DateChartData, series: DateSeries[]): DateRow[] {
  return (chart.buckets ?? []).map((b) => {
    const day = (b.start ?? "").slice(0, 10) || b.label || b.key
    const values = new Map((b.points ?? []).map((p) => [p.seriesKey, p.value]))
    const row: DateRow = { x: day, end: (b.end ?? "").slice(0, 10), total: b.total ?? 0 }
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
 * X-axis tick per granularity. DAY buckets use the weekday/day-month
 * heuristic; WEEK buckets show the week start ("Sep 14") and MONTH buckets
 * the month ("Sep ’26") — never a bare weekday repeated for every bucket.
 */
export function formatBucketTick(day: string, granularity: string, bucketCount: number): string {
  if (granularity === "WEEK") return formatDate(day, "day-month")
  if (granularity === "MONTH") {
    return new Date(`${day}T12:00:00`).toLocaleDateString(DASHBOARD_LOCALE, {
      month: "short",
      year: "2-digit",
    })
  }
  return formatChartAxisTick(day, bucketCount)
}

/** Tooltip headline: a start–end range for WEEK/MONTH, a full date for DAY. */
export function chartTooltipLabel(chart: DateChartData, row: { x: string; end?: string }): string {
  if (
    (chart.granularity === "WEEK" || chart.granularity === "MONTH") &&
    row.end &&
    row.end !== row.x
  ) {
    return `${formatDate(row.x, "day-month")} – ${formatDate(row.end, "day-month")}`
  }
  return row.x ? formatChartTooltipDate(row.x, "long") : ""
}

const PLACEHOLDER_TITLES = /^(some title|title|test( title)?|demo|untitled|lorem( ipsum)?|sample)$/i

/**
 * Backend titles are used verbatim — except obvious placeholders ("some
 * title" is currently sent for top categories), which fall back to the
 * component's own title. Drop this guard once the backend sends real titles.
 */
export function resolveTitle(backendTitle: string | null | undefined, fallback: string): string {
  const t = (backendTitle ?? "").trim()
  return t && !PLACEHOLDER_TITLES.test(t) ? t : fallback
}

/**
 * Whole-percent shares that always sum to exactly 100 (largest remainder),
 * so 100%-stacked bars never overflow the axis through rounding.
 */
export function exactPercentShares(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0)
  if (total <= 0) return values.map(() => 0)
  const raw = values.map((v) => (v / total) * 100)
  const floors = raw.map(Math.floor)
  let rest = 100 - floors.reduce((a, b) => a + b, 0)
  const order = raw
    .map((_r, i) => i)
    .sort((a, b) => (raw[b] ?? 0) - (floors[b] ?? 0) - ((raw[a] ?? 0) - (floors[a] ?? 0)))
  for (const i of order) {
    if (rest <= 0) break
    floors[i] = (floors[i] ?? 0) + 1
    rest -= 1
  }
  return floors
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
