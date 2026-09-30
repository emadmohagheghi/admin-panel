"use client"

// سایدبار داشبورد — دسکتاپ: ثابت (در RTL سمت راست)، موبایل: کشویی با overlay.
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Store, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { NAV_ITEMS } from "@/components/dashboard/nav-items"

type SidebarProps = {
  /** فقط برای موبایل: باز/بسته بودن کشو */
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === href : pathname.startsWith(href)
  }

  return (
    <>
      {/* overlay موبایل */}
      {open && (
        <div
          aria-hidden
          onClick={onClose}
          className="bg-foreground/20 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full rtl:translate-x-full",
          // در RTL، سایدبار از راست می‌آید؛ translate-x-full آن را بیرون می‌برد
        )}
        style={{ transform: open ? undefined : undefined }}
        aria-label="ناوبری اصلی"
      >
        <div className="border-sidebar-border flex h-16 items-center justify-between border-b px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
            <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <Store className="size-4" aria-hidden />
            </span>
            <span>زارینی | مدیریت</span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="بستن منو"
            onClick={onClose}
            className="lg:hidden"
          >
            <X aria-hidden />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-ring/50 focus-visible:ring-3",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4.5 shrink-0" aria-hidden />
                <span>{item.label}</span>
                {active && (
                  <span aria-hidden className="bg-sidebar-primary ms-auto size-1.5 rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-sidebar-border text-sidebar-foreground/50 border-t px-5 py-4 text-xs">
          پنل مدیریت فروشگاه — نسخه ۰.۱
        </div>
      </aside>
    </>
  )
}
