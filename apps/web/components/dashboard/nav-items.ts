// آیتم‌های ناوبری داشبورد — منبع واحد برای سایدبار و موبایل
import { FolderTree, LayoutDashboard, Package, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "نمای کلی", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "محصولات", icon: Package },
  { href: "/dashboard/categories", label: "دسته‌بندی‌ها", icon: FolderTree },
  { href: "/dashboard/users", label: "کاربران", icon: Users },
]
