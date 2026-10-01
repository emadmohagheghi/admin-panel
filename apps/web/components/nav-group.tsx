"use client"

// Sidebar navigation group (from the @efferd/dashboard-3 block) — links use
// next/link so navigation stays client-side. Leaf items render without the
// Collapsible wrapper: wrapping them made defaultOpen flip on navigation and
// Base UI warned about mutating uncontrolled state after init. Group items
// with sub-items keep the Collapsible, keyed by active state so the default
// open state is re-initialized (not mutated) when it changes.
import Link from "next/link"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar"

import type { SidebarNavGroup } from "@/components/app-shared"
import { ChevronRightIcon } from "lucide-react"

export function NavGroup({ label, items }: SidebarNavGroup) {
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) =>
          item.subItems?.length ? (
            <Collapsible
              className="group/collapsible"
              key={`${item.title}:${item.isActive}`}
              defaultOpen={!!item.isActive || item.subItems.some((i) => !!i.isActive)}
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger render={<SidebarMenuButton isActive={item.isActive} />}>
                {item.icon}
                <span>{item.title}</span>
                <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.subItems?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton isActive={subItem.isActive} render={<Link href={subItem.href} />}>
                        {subItem.icon}
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={item.isActive} tooltip={item.title} render={<Link href={item.href} />}>
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
