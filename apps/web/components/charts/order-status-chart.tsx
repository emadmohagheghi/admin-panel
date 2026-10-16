"use client"

// Order status counts per bucket as stacked bars
// (backend: orderStatusMovingWindow). Same single-stack type as the basket
// chart; related statuses are ordered adjacently (CANCELED over PENDING,
// COMPLETE over BEING_PROCESS). Unknown future statuses keep backend order
// in their own group.
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
      groupForKey={orderStatusStackGroup}
      {...props}
    />
  )
}
