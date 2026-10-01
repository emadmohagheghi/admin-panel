"use client"

// Dashboard sidebar (from the @efferd/dashboard-3 shell) wired to the real
// project routes: active state follows the current pathname and links use
// next/link instead of hash anchors.
import Link from "next/link"
import { usePathname } from "next/navigation"
import { StoreIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
} from "@workspace/ui/components/sidebar"

import { NavGroup } from "@/components/nav-group"
import { navGroups } from "@/components/app-shared"

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenuButton tooltip="Dashboard" render={<Link href="/dashboard" />}>
          <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
            <StoreIcon className="size-4" aria-hidden />
          </span>
          <span className="font-medium">Zariny Admin</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        {navGroups(pathname).map((group, index) => (
          <NavGroup key={`sidebar-group-${index}`} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="text-sidebar-foreground/50 px-2 py-1 text-xs group-data-[collapsible=icon]:hidden">
          Zariny Store Admin — v0.1
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
