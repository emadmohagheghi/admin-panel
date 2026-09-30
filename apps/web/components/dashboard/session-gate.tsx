"use client"

// گیت سشن قابل استفاده‌ی مجدد — در layout داشبورد به کار می‌رود:
// loading → اسپینر؛ me=null → ریدایرکت /login؛ وگرنه children با me.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"

import { fetchMe, type Me } from "@/lib/auth-session"

type SessionGateProps = {
  children: (me: Me) => ReactNode
}

export function SessionGate({ children }: SessionGateProps) {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchMe().then((user) => {
      if (cancelled) return
      setMe(user)
      setChecked(true)
      if (!user) router.replace("/login")
    })
    return () => {
      cancelled = true
    }
  }, [router])

  if (!checked || !me) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" aria-hidden />
          <span aria-live="polite">در حال بررسی نشست…</span>
        </div>
      </main>
    )
  }

  return <>{children(me)}</>
}
