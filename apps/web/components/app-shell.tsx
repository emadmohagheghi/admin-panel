import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { OnlinePresenceProvider } from "@/components/online-presence"
import { ScrollEdgeDrag } from "@/components/scroll-edge-drag"
import type { Me } from "@/lib/auth-session"

export function AppShell({
  me,
  children,
}: {
  me: Me
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden">
      {/* First Tab stop: jump past the sidebar straight to the content */}
      <a
        href="#dashboard-content"
        className="sr-only bg-background text-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>
      <OnlinePresenceProvider>
        <SidebarProvider className="relative h-svh">
          <AppSidebar />
          {/* overflow-hidden keeps the sticky header's square background from
					    covering the inset panel's rounded corners */}
          <SidebarInset className="overflow-hidden md:peer-data-[variant=inset]:ml-0">
            <AppHeader me={me} />
            <ScrollArea
              className="min-h-0 flex-1"
              contentClassName="min-w-0!"
              scrollBarClassName="group/scrollbar"
              scrollBarThumbClassName="mx-auto w-1.5 flex-none rounded-full bg-foreground/25 transition-colors hover:bg-foreground/50 group-hover/scrollbar:bg-foreground/40"
            >
              <div
                id="dashboard-content"
                className="flex flex-col gap-4 p-4 md:p-6"
              >
                {children}
              </div>
            </ScrollArea>
          </SidebarInset>
        </SidebarProvider>
      </OnlinePresenceProvider>
      <ScrollEdgeDrag />
    </div>
  )
}
