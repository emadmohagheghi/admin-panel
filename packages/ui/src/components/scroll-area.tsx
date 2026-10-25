"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { cn } from "cn"

function ScrollArea({
  className,
  children,
  scrollBarClassName,
  scrollBarThumbClassName,
  contentClassName,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  scrollBarClassName?: string
  scrollBarThumbClassName?: string
  /** Pass `min-w-0!` for page-level scrollers: Base UI defaults Content to
   *  `min-width: fit-content`, which forces wide tables to widen the whole
   *  page instead of scrolling inside their own container. */
  contentClassName?: string
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-1"
      >
        <ScrollAreaPrimitive.Content className={contentClassName}>
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar
        className={scrollBarClassName}
        thumbClassName={scrollBarThumbClassName}
      />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  thumbClassName,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props & {
  thumbClassName?: string
}) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className={cn("relative flex-1 rounded-full bg-border", thumbClassName)}
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
