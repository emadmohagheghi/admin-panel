"use client"

// Order status counts per bucket as grouped stacked bars
// (backend: orderStatusMovingWindow). Backend's grouping: CANCELED stacks
// over PENDING, COMPLETE over BEING_PROCESS — each group is one stack id so
// the pairs render side by side. Unknown future statuses get their own
// "other" stack.
import type { ComponentProps } from "react"
import { useQuery } from "urql"

import { DateChartFieldsFragmentDoc, OrderStatusChartDocument, useFragment } from "@workspace/graphql"

import { Card } from "@workspace/ui/components/card"

import { MovingWindowBarChart } from "@/components/charts/moving-window-bar-chart"
import { orderStatusStackGroup } from "@/components/charts/date-chart-utils"

export function OrderStatusChart(props: ComponentProps<typeof Card>) {
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({ query: OrderStatusChartDocument })
  const chart = useFragment(DateChartFieldsFragmentDoc, data?.orderStatusMovingWindow)

  return (
    <MovingWindowBarChart
      chart={chart}
      fetching={fetching}
      errorMessage={error?.message}
      onRetry={() => reexecuteQuery({ requestPolicy: "network-only" })}
      fallbackTitle="Order status"
      stackForKey={orderStatusStackGroup}
      {...props}
    />
  )
}
