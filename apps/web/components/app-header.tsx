"use client"

// Dashboard header (from the @efferd/dashboard-3 block): sidebar trigger,
// path-driven breadcrumb, theme toggle and the real user menu.
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"
import { Separator } from "@workspace/ui/components/separator"

import { AppBreadcrumbs } from "@/components/app-breadcrumbs"
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger"
import { navLinks } from "@/components/app-shared"
import { NavUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Me } from "@/lib/auth-session"

export function AppHeader({ me }: { me: Me }) {
  const pathname = usePathname()
  // Longest prefix match so /dashboard/users wins over /dashboard
  const activeItem = [...navLinks(pathname)]
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/") || (item.href === "/dashboard" && pathname === item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]

  return (
    <header
      className={cn(
        "bg-background/80 sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 backdrop-blur md:px-6",
      )}
    >
      <div className="flex items-center gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <AppBreadcrumbs page={activeItem} />
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Separator
          className="h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <NavUser me={me} />
      </div>
    </header>
  )
}
