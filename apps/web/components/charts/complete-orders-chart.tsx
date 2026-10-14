"use client"

// Completed orders over time (backend: completeOrderMovingWindow).
import type { ComponentProps } from "react"
import { useQuery } from "urql"

import { CompleteOrdersChartDocument, DateChartFieldsFragmentDoc, useFragment } from "@workspace/graphql"

import { Card } from "@workspace/ui/components/card"

import { MovingWindowAreaChart } from "@/components/charts/moving-window-area-chart"

export function CompleteOrdersChart(props: ComponentProps<typeof Card>) {
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({ query: CompleteOrdersChartDocument })
  const chart = useFragment(DateChartFieldsFragmentDoc, data?.completeOrderMovingWindow)

  return (
    <MovingWindowAreaChart
      chart={chart}
      fetching={fetching}
      errorMessage={error?.message}
      onRetry={() => reexecuteQuery({ requestPolicy: "network-only" })}
      fallbackTitle="Completed orders"
      {...props}
    />
  )
}
