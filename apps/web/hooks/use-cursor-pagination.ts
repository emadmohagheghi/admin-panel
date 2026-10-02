"use client"

// Forward-only cursor pagination:
// - nextCursor is taken from the page's pageInfo.endCursor and pushed to history
// - "previous" restores the prior cursor from history (no backward request,
//   which would break totalCount)
// Event-driven (call only from callbacks) so it does not affect rendering.
import { useCallback, useState } from "react"

type CursorState = {
  /** Cursor of the current request (null = first page) */
  cursor: string | null
  /** Previous page cursors — powers the "Previous" button */
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

  /** Back to the first page (e.g. after changing a filter) */
  const reset = useCallback(() => {
    setState({ cursor: null, history: [] })
  }, [])

  return {
    cursor: state.cursor,
    canGoBack: state.history.length > 0,
    /** 1-based page number derived from the cursor history depth */
    page: state.history.length + 1,
    goNext,
    goBack,
    reset,
  }
}
