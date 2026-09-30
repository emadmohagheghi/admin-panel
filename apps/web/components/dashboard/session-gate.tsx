"use client"

// Reusable session gate — used in the dashboard layout:
// 1) loading → spinner
// 2) auth error / no user → redirect /login
// 3) other error (e.g. permission or network) → show error with retry (no redirect!)
// (4) valid user → render children with me
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
  /** Retry counter — changing it re-runs the effect */
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
        // Non-auth error: show it, do not redirect
        setError(result.error)
        return
      }
      // Really not signed in
      router.replace("/login")
    })
    return () => {
      cancelled = true
    }
  }, [router, attempt])

  if (!checked) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <Loader2 className="animate-spin" aria-hidden />
          <span aria-live="polite">Checking your session…</span>
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
              Retry
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.replace("/login")}>
              Go to sign-in
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
              Clear session
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (!me) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <Loader2 className="animate-spin" aria-hidden />
          <span aria-live="polite">Redirecting to sign-in…</span>
        </div>
      </main>
    )
  }

  return <>{children(me)}</>
}
