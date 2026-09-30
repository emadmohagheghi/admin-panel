"use client"

// لی‌اوت داشبورد — گیت سشن + سایدبار + هدر.
// state سایدبار موبایل اینجاست چون بین سایدبار و هدر مشترک است.
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
          <div className="lg:ps-64">
            <Header onOpenSidebar={() => setSidebarOpen(true)} me={me} />
            <main className="p-4 sm:p-6">{children}</main>
            <footer className="text-muted-foreground px-6 pb-6 text-xs">
              © ۱۴۰۵ فروشگاه زارینی
            </footer>
          </div>
        </div>
      )}
    </SessionGate>
  )
}
