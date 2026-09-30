"use client"

// Theme toggle — built on next-themes.
// Both icons render and CSS (the `dark` class) decides which is visible;
// no extra state and no hydration mismatch risk.
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle light/dark theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon aria-hidden className="dark:hidden" />
      <Sun aria-hidden className="hidden dark:block" />
    </Button>
  )
}
