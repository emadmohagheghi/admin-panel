import type { ReactNode } from "react"
import {
  LayoutDashboardIcon,
  PackageIcon,
  UsersIcon,
  LayersIcon,
  ShapesIcon,
  SlidersHorizontalIcon,
  FolderTreeIcon,
} from "lucide-react"

export type SidebarNavItem = {
  title: string
  href: string
  icon?: ReactNode
  isActive?: boolean
  subItems?: SidebarNavItem[]
}

export type SidebarNavGroup = {
  label?: string
  items: SidebarNavItem[]
}

/** Resolve at request time so the active item follows the current URL. */
export function navGroups(pathname: string): SidebarNavGroup[] {
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href)

  return [
    {
      items: [{ title: "Dashboard", href: "/dashboard", icon: <LayoutDashboardIcon />, isActive: isActive("/dashboard") }],
    },
    {
      label: "Catalog",
      items: [
        { title: "Products", href: "/dashboard/products", icon: <PackageIcon />, isActive: isActive("/dashboard/products") },
        { title: "Product Classes", href: "/dashboard/product-classes", icon: <ShapesIcon />, isActive: isActive("/dashboard/product-classes") },
        { title: "Attributes", href: "/dashboard/attributes", icon: <SlidersHorizontalIcon />, isActive: isActive("/dashboard/attributes") },
        { title: "Categories", href: "/dashboard/categories", icon: <FolderTreeIcon />, isActive: isActive("/dashboard/categories") },
      ],
    },
    {
      label: "Accounts",
      items: [
        { title: "Users", href: "/dashboard/users", icon: <UsersIcon />, isActive: isActive("/dashboard/users") },
      ],
    },
    {
      label: "Inventory",
      items: [
        { title: "Variants", href: "/dashboard/variants", icon: <LayersIcon />, isActive: isActive("/dashboard/variants") },
      ],
    },
  ]
}

/** Flat list of all nav items — used by the header breadcrumb. */
export function navLinks(pathname: string): SidebarNavItem[] {
  return navGroups(pathname).flatMap((group) => group.items)
}
