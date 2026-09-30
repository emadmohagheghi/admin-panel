"use client"

// Dashboard header — mobile menu button, theme toggle, user menu with logout.
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, LogOut, Menu } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"

import { logout, type Me } from "@/lib/auth-session"
import { ThemeToggle } from "@/components/theme-toggle"

type HeaderProps = {
  /** Mobile only: open the sidebar */
  onOpenSidebar: () => void
  me: Me
}

export function Header({ onOpenSidebar, me }: HeaderProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menuOpen])

  const displayName = [me.firstName, me.lastName].filter(Boolean).join(" ") || me.email
  const initials = (me.firstName[0] ?? me.email[0] ?? "?").toUpperCase()

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    toast.success("Signed out successfully")
    router.replace("/login")
  }

  return (
    <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onClick={onOpenSidebar}
          className="lg:hidden"
        >
          <Menu aria-hidden />
        </Button>

        <div className="flex-1" />

        <ThemeToggle />

        <div ref={menuRef} className="relative">
          <Button
            variant="ghost"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="gap-2"
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-40 truncate sm:inline">{displayName}</span>
            <ChevronDown
              aria-hidden
              className={menuOpen ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </Button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="User menu"
              className="bg-popover text-popover-foreground absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border p-1 shadow-lg"
            >
              <div className="border-b px-3 py-2.5">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="text-muted-foreground truncate text-xs">{me.email}</p>
              </div>
              <button
                role="menuitem"
                onClick={handleLogout}
                className="text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none"
              >
                <LogOut aria-hidden className="size-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
