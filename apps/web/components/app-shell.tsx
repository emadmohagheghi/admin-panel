import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import type { Me } from "@/lib/auth-session";

export function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
	return (
		<div className="overflow-hidden">
			{/* First Tab stop: jump past the sidebar straight to the content */}
			<a
				href="#dashboard-content"
				className="bg-background text-foreground sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
			>
				Skip to content
			</a>
			<SidebarProvider className="relative h-svh">
				<AppSidebar />
				{/* overflow-hidden keeps the sticky header's square background from
				    covering the inset panel's rounded corners */}
				<SidebarInset className="overflow-hidden md:peer-data-[variant=inset]:ml-0">
					<AppHeader me={me} />
					<div id="dashboard-content" className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
}
