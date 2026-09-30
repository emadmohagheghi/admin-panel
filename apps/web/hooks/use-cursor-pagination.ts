"use client"

// صفحه‌بندی cursor رو به جلو:
// - nextCursor از pageInfo.endCursor همان صفحه گرفته و به تاریخچه افزوده می‌شود
// - «قبلی» یعنی برگرداندن cursor صفحه‌ی قبل از تاریخچه (بدون درخواست backward)
// رویدادمحور است (فقط از داخل callback صدا زده می‌شود) تا اثری در رندر نداشته باشد.
import { useCallback, useState } from "react"

type CursorState = {
  /** cursor درخواست جاری (null = صفحه‌ی اول) */
  cursor: string | null
  /** cursorهای صفحات قبلی — برای دکمه‌ی «قبلی» */
  history: (string | null)[]
}

export function useCursorPagination() {
  const [state, setState] = useState<CursorState>({ cursor: null, history: [] })

  const goNext = useCallback((nextCursor: string) => {
    setState((s) => ({ cursor: nextCursor, history: [...s.history, s.cursor] }))
  }, [])

  const goBack = useCallback(() => {
    setState((s) => {
      if (s.history.length === 0) return s
      const previous = s.history[s.history.length - 1] ?? null
      return { cursor: previous, history: s.history.slice(0, -1) }
    })
  }, [])

  /** بازگشت به صفحه‌ی اول (مثلاً بعد از تغییر فیلتر) */
  const reset = useCallback(() => {
    setState({ cursor: null, history: [] })
  }, [])

  return {
    cursor: state.cursor,
    canGoBack: state.history.length > 0,
    goNext,
    goBack,
    reset,
  }
}
