"use client"

// Dashboard layout — session gate wraps the new app shell (from the
// @efferd/dashboard-3 block). The gate keeps its original behavior:
// loading → spinner, auth error → redirect to /login, other error → retry.
import { SessionGate } from "@/components/dashboard/session-gate"
import { AppShell } from "@/components/app-shell"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      {(me) => (
        <AppShell me={me}>
          {children}
          <footer className="text-muted-foreground px-1 pb-2 text-xs">© 2026 Zariny Store</footer>
        </AppShell>
      )}
    </SessionGate>
  )
}
