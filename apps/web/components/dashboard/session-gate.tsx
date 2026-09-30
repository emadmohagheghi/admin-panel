"use client"

// گیت سشن قابل استفاده‌ی مجدد — در layout داشبورد به کار می‌رود:
// ۱) loading → اسپینر
// ۲) خطای احراز هویت / عدم کاربر → ریدایرکت /login
// ۳) خطای دیگر (مثل پرمیشن یا شبکه) → نمایش خطا با دکمه‌ی تلاش مجدد (بدون ریدایرکت!)
// (۴) کاربر معتبر → رندر children با me
import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw, TriangleAlert } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { fetchMe, logout, type Me } from "@/lib/auth-session"

type FetchMeResult =
  | { user: Me }
  | { error: string }
  | null

type SessionGateProps = {
  children: (me: Me) => ReactNode
}

export function SessionGate({ children }: SessionGateProps) {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  /** شمارنده برای تلاش مجدد (تغییرش useEffect را دوباره اجرا می‌کند) */
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetchMe().then((result: FetchMeResult) => {
      if (cancelled) return
      setChecked(true)
      setError(null)

      if (result && "user" in result) {
        setMe(result.user)
        return
      }
      if (result && "error" in result) {
        // خطای غیراحراز-هویتی: نمایش بده، ریدایرکت نکن (مورد ۲ دستور)
        setError(result.error)
        return
      }
      // واقعاً لاگین نیست
      router.replace("/login")
    })
    return () => {
      cancelled = true
    }
  }, [router, attempt])

  if (!checked) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" aria-hidden />
          <span aria-live="polite">در حال بررسی نشست…</span>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <div
          role="alert"
          className="bg-destructive/10 text-destructive flex max-w-md flex-col items-center gap-4 rounded-xl px-6 py-8 text-center"
        >
          <TriangleAlert className="size-8" aria-hidden />
          <p className="text-sm leading-6">{error}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              <RefreshCw aria-hidden data-icon="inline-start" />
              تلاش مجدد
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.replace("/login")}>
              رفتن به صفحه‌ی ورود
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout()
                  .then(() => router.replace("/login"))
                  .catch(() => router.replace("/login"))
              }}
            >
              پاک‌سازی سشن
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (!me) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" aria-hidden />
          <span aria-live="polite">در حال انتقال به صفحه‌ی ورود…</span>
        </div>
      </main>
    )
  }

  return <>{children(me)}</>
}
