"use client"

// App providers — urql for now; sonner (toasts) is mounted in the root layout.
import { useMemo } from "react"
import type { ReactNode } from "react"
import { Provider } from "urql"

import { makeClient } from "@/lib/urql"

export function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(() => makeClient(), [])
  return <Provider value={client}>{children}</Provider>
}
