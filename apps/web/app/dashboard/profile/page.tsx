"use client"

// Profile page — the signed-in user's account details from the Me query.
// The menu's "Profile" item lands here; avatar renders through the same-origin
// media proxy (the backend's self-signed cert blocks direct browser fetches).
import { useQuery } from "urql"
import { MeDocument } from "@workspace/graphql"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"

import { backendMediaProxyUrl } from "@/lib/backend-media"

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString()
}

export default function ProfilePage() {
  const [{ data, fetching, error }] = useQuery({ query: MeDocument })
  const me = data?.me ?? null

  const displayName =
    [me?.firstName, me?.lastName].filter(Boolean).join(" ") || me?.email || "Account"
  const initials = (me?.firstName?.[0] ?? me?.email?.[0] ?? "?").toUpperCase()
  const avatarUrl = backendMediaProxyUrl(me?.avatar?.url)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">Your account details</p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm"
        >
          Failed to load profile: {error.message}
        </div>
      )}

      {fetching && !me && (
        <div className="bg-muted h-48 animate-pulse rounded-xl" aria-hidden />
      )}

      {me && (
        <Card>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar className="size-16">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-lg font-semibold">{displayName}</p>
                <p className="text-muted-foreground truncate text-sm">{me.email}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {me.isStaff ? <Badge>Staff</Badge> : null}
                  {me.isActive ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="warning">Inactive</Badge>
                  )}
                  {me.isConfirmed ? (
                    <Badge variant="secondary">Confirmed</Badge>
                  ) : (
                    <Badge variant="warning">Unconfirmed</Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-muted-foreground text-xs">Email</dt>
                <dd className="truncate font-medium">{me.email}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground text-xs">Language</dt>
                <dd className="font-medium uppercase">{me.languageCode}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground text-xs">Joined</dt>
                <dd className="font-medium">{formatDate(me.dateJoined)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground text-xs">Last login</dt>
                <dd className="font-medium">{formatDate(me.lastLogin)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
