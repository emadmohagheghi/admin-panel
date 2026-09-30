"use client"

// دکمه‌ی تغییر تم — از next-themes استفاده می‌کند.
// هر دو آیکون رندر می‌شوند و CSS (کلاس dark) تصمیم می‌گیرد کدام دیده شود؛
// بدون state اضافه و بدون ریسک hydration mismatch.
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="تغییر تم روشن/تاریک"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon aria-hidden className="dark:hidden" />
      <Sun aria-hidden className="hidden dark:block" />
    </Button>
  )
}
