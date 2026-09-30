"use client"

// صفحه‌ی موقت داشبورد — گیت سشن سمت کلاینت:
// ۱) در حال بارگذاری → اسپینر مرکزی
// ۲) me === null → ریدایرکت به /login (لایه‌ی دومِ گیت proxy.ts)
// ۳) کاربر معتبر → خوش‌آمد (محتوای واقعی در مرحله‌ی لی‌اوت اضافه می‌شود)
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogOut } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { fetchMe, logout, type Me } from "@/lib/auth-session"

export default function DashboardPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [status, setStatus] = useState<"loading" | "ready">("loading")

  useEffect(() => {
    let cancelled = false
    fetchMe().then((user) => {
      if (cancelled) return
      if (!user) {
        router.replace("/login")
        return
      }
      setMe(user)
      setStatus("ready")
    })
    return () => {
      cancelled = true
    }
  }, [router])

  async function handleLogout() {
    await logout()
    router.replace("/login")
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" aria-hidden />
          <span aria-live="polite">در حال بررسی نشست…</span>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="space-y-1 text-center">
        <p className="text-muted-foreground text-sm">ورود موفق</p>
        <h1 className="text-2xl font-bold tracking-tight">
          سلام {me?.firstName || me?.email || "کاربر"} 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          لی‌اوت کامل داشبورد در مرحله‌ی بعد ساخته می‌شود.
        </p>
      </div>
      <Button variant="outline" onClick={handleLogout}>
        <LogOut aria-hidden data-icon="inline-start" />
        خروج از حساب
      </Button>
    </main>
  )
}
