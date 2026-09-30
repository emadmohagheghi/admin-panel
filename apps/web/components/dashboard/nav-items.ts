// آیتم‌های ناوبری داشبورد — منبع واحد برای سایدبار و موبایل
import { FolderTree, LayoutDashboard, Package, Shapes, SlidersHorizontal, Users, Layers } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "نمای کلی", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "کاربران", icon: Users },
  { href: "/dashboard/products", label: "محصولات", icon: Package },
  { href: "/dashboard/categories", label: "دسته‌بندی‌ها", icon: FolderTree },
  { href: "/dashboard/variants", label: "واریانت‌ها", icon: Layers },
  { href: "/dashboard/product-classes", label: "کلاس‌های محصول", icon: Shapes },
  { href: "/dashboard/attributes", label: "ویژگی‌ها", icon: SlidersHorizontal },
]
