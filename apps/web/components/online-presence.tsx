"use client"

// Keeps the live presence subscription mounted for the whole authenticated
// dashboard, so the admin stays online on every page — not only where the
// online count is displayed.
import { createContext, useContext, type ReactNode } from "react"

import { useOnlineCount, type OnlineCount } from "@/hooks/use-online-count"

const OnlinePresenceContext = createContext<OnlineCount | null>(null)

export function OnlinePresenceProvider({ children }: { children: ReactNode }) {
  const online = useOnlineCount()
  return (
    <OnlinePresenceContext.Provider value={online}>
      {children}
    </OnlinePresenceContext.Provider>
  )
}

export function useOnlinePresence(): OnlineCount {
  const online = useContext(OnlinePresenceContext)
  if (!online) {
    throw new Error(
      "useOnlinePresence must be used inside OnlinePresenceProvider"
    )
  }
  return online
}
