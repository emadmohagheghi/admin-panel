"use client"

// Shared error banner + toast helper for list pages.
// Toast gives instant feedback; the banner keeps the error visible in place.
import { useEffect } from "react"
import { RefreshCw, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

type ErrorBannerProps = {
  error: string | null | undefined
  onRetry?: () => void
  /** Shown in the toast; defaults to the error message itself */
  toastPrefix?: string
}

export function ErrorBanner({ error, onRetry, toastPrefix }: ErrorBannerProps) {
  // Surface each new error as a toast as well (a11y: sonner announces politely)
  useEffect(() => {
    if (error) {
      toast.error(toastPrefix ? `${toastPrefix}: ${error}` : error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per error value
  }, [error])

  if (!error) return null

  return (
    <div
      role="alert"
      className="bg-destructive/10 text-destructive flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm"
    >
      <span className="flex items-center gap-2">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        {error}
      </span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden data-icon="inline-start" />
          Retry
        </Button>
      )}
    </div>
  )
}
