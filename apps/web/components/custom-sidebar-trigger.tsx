import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";

export function CustomSidebarTrigger() {
	return (
		<Tooltip>
			<TooltipTrigger delay={1000} render={<SidebarTrigger />} />
			<TooltipContent className="px-2 py-1" side="right">
				Toggle Sidebar{" "}
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<Kbd>b</Kbd>
				</KbdGroup>
			</TooltipContent>
		</Tooltip>
	);
}
