"use client"

// Provider کلاینت اپ — فعلاً urql؛ بعداً سونر (توست) هم همین‌جا اضافه می‌شود.
import { useMemo } from "react"
import type { ReactNode } from "react"
import { Provider } from "urql"

import { makeClient } from "@/lib/urql"

export function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(() => makeClient(), [])
  return <Provider value={client}>{children}</Provider>
}
