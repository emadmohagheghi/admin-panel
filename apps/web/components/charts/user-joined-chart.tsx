"use client"

// New users over time (backend: userJoinedMovingWindow).
import type { ComponentProps } from "react"
import { useQuery } from "urql"

import { DateChartFieldsFragmentDoc, UserJoinedChartDocument, useFragment } from "@workspace/graphql"
import { Card } from "@workspace/ui/components/card"

import { MovingWindowAreaChart } from "@/components/charts/moving-window-area-chart"

export function UserJoinedChart(props: ComponentProps<typeof Card>) {
  const [{ data, fetching, error }, reexecuteQuery] = useQuery({ query: UserJoinedChartDocument })
  const chart = useFragment(DateChartFieldsFragmentDoc, data?.userJoinedMovingWindow)

  return (
    <MovingWindowAreaChart
      chart={chart}
      fetching={fetching}
      errorMessage={error?.message}
      onRetry={() => reexecuteQuery({ requestPolicy: "network-only" })}
      fallbackTitle="New users"
      aggregate="weekly"
      {...props}
    />
  )
}
