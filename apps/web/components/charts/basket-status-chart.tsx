"use client"

// Basket status counts per bucket as stacked bars
// (backend: basketStatusMovingWindow). All five statuses share one stack.
import type { ComponentProps } from "react"
import { useQuery } from "urql"

import { BasketStatusChartDocument, DateChartFieldsFragmentDoc, useFragment } from "@workspace/graphql"

import { Card } from "@workspace/ui/components/card"

import { MovingWindowBarChart } from "@/components/charts/moving-window-bar-chart"

export function BasketStatusChart(props: ComponentProps<typeof Card>) {
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({ query: BasketStatusChartDocument })
  const chart = useFragment(DateChartFieldsFragmentDoc, data?.basketStatusMovingWindow)

  return (
    <MovingWindowBarChart
      chart={chart}
      fetching={fetching}
      errorMessage={error?.message}
      onRetry={() => reexecuteQuery({ requestPolicy: "network-only" })}
      fallbackTitle="Basket status"
      {...props}
    />
  )
}
