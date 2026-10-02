"use client"

// User menu (from the @efferd/dashboard-3 block) wired to the real session:
// the user comes from the SessionGate's `me` query (passed down as a prop),
// logout calls the real mutation. Falls back gracefully when me fields are
// missing (name/email/avatar).
//
// Base UI note: our DropdownMenuLabel maps to Menu.GroupLabel, which MUST sit
// inside a DropdownMenuGroup — an unwrapped label throws
// "MenuGroupContext is missing" on open and crashes the whole app.
import { useRouter } from "next/navigation"
import {
  BellIcon,
  CircleHelpIcon,
  CreditCardIcon,
  GraduationCapIcon,
  KeyboardIcon,
  LogOutIcon,
  SquareUserIcon,
} from "lucide-react"
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
import { backendMediaProxyUrl } from "@/lib/backend-media"

export function NavUser({ me }: { me: Me }) {
  const router = useRouter()

  const displayName =
    [me.firstName, me.lastName].filter(Boolean).join(" ") || me.email || "Account"
  const initials = (me.firstName?.[0] ?? me.email?.[0] ?? "?").toUpperCase()
  // Browser never talks to the backend directly (self-signed cert): media
  // URLs are rewritten to the same-origin media proxy.
  const avatarUrl = backendMediaProxyUrl(me.avatar?.url)

  async function handleLogout() {
    // No toast: the redirect to sign-in is the confirmation. Failures are
    // swallowed — local session state is cleared by the redirect regardless.
    try {
      await logout()
    } catch {
      // ignore
    } finally {
      router.replace("/login")
    }
  }

  function comingSoon() {
    toast.info("This section is coming soon")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-8 gap-2 px-1.5" aria-label="User menu" />}
      >
        <Avatar className="size-7">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-40 truncate sm:inline" title={displayName}>
          {displayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3">
            <Avatar className="size-10">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="block truncate font-medium text-foreground" title={displayName}>
                {displayName}
              </span>
              <div className="text-muted-foreground truncate text-xs" title={me.email ?? undefined}>
                {me.email ?? "—"}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              router.push("/dashboard/profile")
            }}
          >
            <SquareUserIcon aria-hidden />
            Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={comingSoon}>
            <BellIcon aria-hidden />
            Notifications
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={comingSoon}>
            <KeyboardIcon aria-hidden />
            Keyboard shortcuts
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={comingSoon}>
            <CircleHelpIcon aria-hidden />
            Help center
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={comingSoon}>
            <GraduationCapIcon aria-hidden />
            Agent training
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={comingSoon}>
            <CreditCardIcon aria-hidden />
            Subscription
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="w-full cursor-pointer"
            variant="destructive"
            onClick={handleLogout}
          >
            <LogOutIcon aria-hidden />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
