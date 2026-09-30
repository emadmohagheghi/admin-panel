// Dashboard navigation items — single source for sidebar and mobile drawer
import { FolderTree, LayoutDashboard, Package, Shapes, SlidersHorizontal, Users, Layers } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/categories", label: "Categories", icon: FolderTree },
  { href: "/dashboard/variants", label: "Variants", icon: Layers },
  { href: "/dashboard/product-classes", label: "Product Classes", icon: Shapes },
  { href: "/dashboard/attributes", label: "Attributes", icon: SlidersHorizontal },
]
