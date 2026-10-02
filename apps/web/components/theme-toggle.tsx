"use client"

// Theme toggle — built on next-themes.
// Both icons render and CSS (the `dark` class) decides which is visible;
// no extra state and no hydration mismatch risk. The crossfade only plays
// when the theme changes without a user click (e.g. the OS scheme flips):
// next-themes' disableTransitionOnChange intentionally suppresses
// transitions on manual toggles.
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
      <span className="relative grid size-4 place-items-center">
        <Moon
          aria-hidden
          className="absolute scale-100 opacity-100 blur-none transition-[opacity,scale,filter] duration-150 dark:scale-25 dark:opacity-0 dark:blur-[4px]"
        />
        <Sun
          aria-hidden
          className="absolute scale-25 opacity-0 blur-[4px] transition-[opacity,scale,filter] duration-150 dark:scale-100 dark:opacity-100 dark:blur-none"
        />
      </span>
    </Button>
  )
}
