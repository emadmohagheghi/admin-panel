"use client"

import { useEffect, useRef } from "react"

const MIN_THUMB_HEIGHT = 40

export function ScrollEdgeDrag() {
  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const strip = stripRef.current
    const content = document.getElementById("dashboard-content")
    const viewport = content?.closest(
      '[data-slot="scroll-area-viewport"]'
    )
    if (!strip || !viewport) return

    const edge = strip
    const scroller = viewport
    let pointerId: number | null = null
    let startY = 0
    let startScrollTop = 0
    let maxScroll = 0
    let thumbTravel = 1

    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0) return

      maxScroll = scroller.scrollHeight - scroller.clientHeight
      if (maxScroll <= 0) return

      const track = scroller.clientHeight
      const thumb = Math.max(
        MIN_THUMB_HEIGHT,
        track * (track / scroller.scrollHeight)
      )

      event.preventDefault()
      thumbTravel = Math.max(1, track - thumb)
      pointerId = event.pointerId
      startY = event.clientY
      startScrollTop = scroller.scrollTop
      edge.setPointerCapture(event.pointerId)
      document.body.style.userSelect = "none"
    }

    function handlePointerMove(event: PointerEvent) {
      if (pointerId !== event.pointerId) return

      const delta = event.clientY - startY
      scroller.scrollTop = startScrollTop + (delta / thumbTravel) * maxScroll
    }

    function handlePointerEnd(event: PointerEvent) {
      if (pointerId !== event.pointerId) return

      if (edge.hasPointerCapture(event.pointerId)) {
        edge.releasePointerCapture(event.pointerId)
      }
      pointerId = null
      document.body.style.userSelect = ""
    }

    function handleWheel(event: WheelEvent) {
      if (scroller.scrollHeight <= scroller.clientHeight) return

      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * 16
        : event.deltaY
      scroller.scrollTop += delta
      event.preventDefault()
    }

    edge.addEventListener("pointerdown", handlePointerDown)
    edge.addEventListener("pointermove", handlePointerMove)
    edge.addEventListener("pointerup", handlePointerEnd)
    edge.addEventListener("pointercancel", handlePointerEnd)
    edge.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      edge.removeEventListener("pointerdown", handlePointerDown)
      edge.removeEventListener("pointermove", handlePointerMove)
      edge.removeEventListener("pointerup", handlePointerEnd)
      edge.removeEventListener("pointercancel", handlePointerEnd)
      edge.removeEventListener("wheel", handleWheel)
      document.body.style.userSelect = ""
    }
  }, [])

  return (
    <div
      ref={stripRef}
      aria-hidden
      className="fixed inset-y-0 right-0 z-50 hidden w-2 touch-none md:block"
    />
  )
}
