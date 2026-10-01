"use client"

// User menu (from the @efferd/dashboard-3 block) wired to the real session:
// the user comes from the SessionGate's `me` query (passed down as a prop),
// logout calls the real mutation. Falls back gracefully when me fields are
// missing (name/email/avatar).
import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"
import { toast } from "sonner"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@workspace/ui/components/button"

import { logout, type Me } from "@/lib/auth-session"

export function NavUser({ me }: { me: Me }) {
  const router = useRouter()

  const displayName =
    [me.firstName, me.lastName].filter(Boolean).join(" ") || me.email || "Account"
  const initials = (me.firstName?.[0] ?? me.email?.[0] ?? "?").toUpperCase()

  async function handleLogout() {
    try {
      await logout()
      toast.success("Signed out successfully")
    } catch {
      toast.error("Sign out failed")
    } finally {
      router.replace("/login")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-8 gap-2 px-1.5" aria-label="User menu" />}
      >
        <Avatar className="size-7">
          {me.avatar?.url ? <AvatarImage src={me.avatar.url} alt="" /> : null}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-40 truncate sm:inline">{displayName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3">
          <Avatar className="size-10">
            {me.avatar?.url ? <AvatarImage src={me.avatar.url} alt="" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <span className="block truncate font-medium text-foreground">{displayName}</span>
            <div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground text-xs">
              {me.email ?? "—"}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="w-full cursor-pointer"
            variant="destructive"
            onClick={handleLogout}
          >
            <LogOutIcon aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
