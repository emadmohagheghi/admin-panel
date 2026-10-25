// Shared helpers for the backend-driven dashboard charts (DateChart/SimpleChart).
// A DateChart carries `series` (key/label pairs) plus `buckets`; each bucket
// holds `points` that join back to a series via `seriesKey`. Series keys come
// from the backend (status names etc.) so everything here stays dynamic:
// dataKeys are safe synthetic ids (`s0`, `s1`, …) while labels/colors resolve
// through the evilcharts ChartConfig.
//
// Colors are explicit hex pairs (same both modes): the app theme is
// intentionally monochrome, which would render every series in gray.
import type { ChartConfig } from "@/components/evilcharts/ui/echarts-chart"
import type { DateChartFieldsFragment } from "@workspace/graphql"

import { formatChartAxisTick, formatDate } from "@/components/formater"

export type DateChartData = DateChartFieldsFragment

export type DateSeries = {
  /** Safe synthetic dataKey used in echarts (`s0`, …) */
  id: string
  /** Backend series key (e.g. an order status) */
  key: string
  label: string
  color: ThemePair
}

export type DateRow = {
  /** Pre-formatted category label for the axis/tooltip (granularity-aware) */
  x: string
  total: number
} & Record<string, number | string>

// Colors are evilcharts' own official palette (from their docs examples):
// tailwind-500 for light mode, tailwind-400 for dark — passed as explicit
// light/dark pairs so each mode renders its native variant.
type ThemePair = { light: string; dark: string }

const EVIL_BLUE: ThemePair = { light: "#3b82f6", dark: "#60a5fa" }
const EVIL_EMERALD: ThemePair = { light: "#10b981", dark: "#34d399" }
const EVIL_AMBER: ThemePair = { light: "#f59e0b", dark: "#fbbf24" }
const EVIL_VIOLET: ThemePair = { light: "#8b5cf6", dark: "#a78bfa" }
const EVIL_ROSE: ThemePair = { light: "#be123c", dark: "#f43f5e" }
const EVIL_GRAY: ThemePair = { light: "#6b7280", dark: "#9ca3af" }

const CATEGORY_PALETTE: ThemePair[] = [
  EVIL_BLUE,
  EVIL_EMERALD,
  EVIL_AMBER,
  EVIL_VIOLET,
  EVIL_ROSE,
  EVIL_GRAY,
]

/** Primary accent for single-series charts (areas, top categories). */
export const CHART_ACCENT: ThemePair = EVIL_BLUE

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "")
}

/** Semantic color pair for known status keys; null when unfamiliar. */
function semanticColor(key: string): ThemePair | null {
  const k = normalizeKey(key)
  if (k.includes("cancel")) return EVIL_ROSE
  if (k.includes("pending")) return EVIL_AMBER
  if (k.includes("complet") || k.includes("submit")) return EVIL_EMERALD
  if (k.includes("being") || k.includes("process")) return EVIL_BLUE
  if (k.includes("open")) return EVIL_BLUE
  if (k.includes("merg")) return EVIL_VIOLET
  if (k.includes("sav")) return EVIL_AMBER
  if (k.includes("froz")) return EVIL_GRAY
  return null
}

export function colorForSeriesKey(key: string, index: number): ThemePair {
  return semanticColor(key) ?? CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] ?? EVIL_BLUE
}

/** Humanized series label. The backend sends raw enum names as labels
 *  ("BEING_PROCESSED"), so all-caps identifiers are title-cased, while
 *  real labels like "Home & Kitchen" pass through untouched. */
function seriesLabel(key: string, label: string | null | undefined): string {
  const raw = label || key
  if (!/^[A-Z0-9_]+$/.test(raw)) return raw
  return raw
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
}

export function toDateSeries(chart: DateChartData): DateSeries[] {
  return (chart.series ?? []).map((s, i) => ({
    id: `s${i}`,
    key: s.key,
    label: seriesLabel(s.key, s.label),
    color: colorForSeriesKey(s.key, i),
  }))
}

/**
 * X category per granularity. DAY buckets use the weekday/day-month
 * heuristic; WEEK buckets show the week start ("Sep 14") and MONTH buckets
 * the month ("Sep ’26") — never a bare weekday repeated for every bucket.
 */
export function formatBucketX(day: string, granularity: string, bucketCount: number): string {
  if (granularity === "WEEK") return formatDate(day, "day-month")
  if (granularity === "MONTH") {
    return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    })
  }
  return formatChartAxisTick(day, bucketCount)
}

/** Buckets → chart rows. `x` is the pre-formatted category label
 * (evilcharts tooltips show the raw x value, so it must be display-ready).
 * Missing series points default to 0. */
export function toDateRows(chart: DateChartData, series: DateSeries[]): DateRow[] {
  const buckets = chart.buckets ?? []
  return buckets.map((b) => {
    const day = (b.start ?? "").slice(0, 10) || b.label || b.key
    const values = new Map((b.points ?? []).map((p) => [p.seriesKey, p.value]))
    const row: DateRow = {
      x: formatBucketX(day, chart.granularity, buckets.length),
      total: b.total ?? 0,
    }
    for (const s of series) row[s.id] = values.get(s.key) ?? 0
    return row
  })
}

export function buildSeriesConfig(series: DateSeries[]): ChartConfig {
  const config: ChartConfig = {}
  for (const s of series) {
    config[s.id] = { label: s.label, colors: { light: [s.color.light], dark: [s.color.dark] } }
  }
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
 * Dense daily windows (e.g. 91 buckets for "the last 90 days") are too busy
 * for an area chart — aggregate consecutive buckets into weekly sums once the
 * window exceeds ~a month. Returns null when the chart is already coarse.
 */
const DENSE_BUCKET_LIMIT = 31
const WEEK_CHUNK = 7

export function aggregateWeekly(chart: DateChartData): DateChartData | null {
  const buckets = chart.buckets ?? []
  if (buckets.length <= DENSE_BUCKET_LIMIT) return null
  const chunks: DateChartData["buckets"] = []
  for (let i = 0; i < buckets.length; i += WEEK_CHUNK) {
    const group = buckets.slice(i, i + WEEK_CHUNK)
    const first = group[0]
    const last = group[group.length - 1]
    if (!first || !last) continue
    const sums = new Map<string, number>()
    let total = 0
    for (const b of group) {
      total += b.total ?? 0
      for (const p of b.points ?? []) {
        sums.set(p.seriesKey, (sums.get(p.seriesKey) ?? 0) + p.value)
      }
    }
    chunks.push({
      __typename: "Bucket",
      key: `w${chunks.length}`,
      label: first.label,
      start: first.start,
      end: last.end,
      total,
      points: [...sums.entries()].map(([seriesKey, value]) => ({
        __typename: "DataPoint" as const,
        seriesKey,
        value,
      })),
    })
  }
  return { ...chart, buckets: chunks }
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
 * Group id for the order-status chart (backend's pairing: CANCELED with
 * PENDING, COMPLETE with BEING_PROCESS). Keys are normalized before matching
 * so `BEING_PROCESS`, `being process`, `BeingProcess` all land in the same
 * group; unknown future statuses fall into their own "other" group. Used only
 * to order series adjacently inside the single shared stack.
 */
export function orderStatusStackGroup(key: string): string {
  const k = normalizeKey(key)
  if (k.includes("cancel") || k.includes("pending")) return "pending"
  if (k.includes("complet") || k.includes("being") || k.includes("process")) return "processing"
  return "other"
}
