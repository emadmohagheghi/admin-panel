"use client"

// Dashboard layout — session gate + sidebar + header.
// Mobile sidebar state lives here because it is shared between the two.
import { useState } from "react"

import { Header } from "@/components/dashboard/header"
import { Sidebar } from "@/components/dashboard/sidebar"
import { SessionGate } from "@/components/dashboard/session-gate"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SessionGate>
      {(me) => (
        <div className="min-h-svh">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="lg:pl-64">
            <Header onOpenSidebar={() => setSidebarOpen(true)} me={me} />
            <main className="p-4 sm:p-6">{children}</main>
            <footer className="text-muted-foreground px-6 pb-6 text-xs">
              © 2026 Zariny Store
            </footer>
          </div>
        </div>
      )}
    </SessionGate>
  )
}
