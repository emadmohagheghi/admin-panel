"use client"

import { useParams } from "next/navigation"
import { useQuery } from "urql"
import {
  CalendarDaysIcon,
  ClockIcon,
  GlobeIcon,
  KeyRoundIcon,
  MailIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  UserDetailDocument,
  type UserDetailQuery,
  type UserDetailQueryVariables,
} from "@workspace/graphql"

import {
  DetailPageHeader,
  InfoRow,
  JsonMetadata,
} from "@/components/dashboard/detail"
import { ErrorBanner } from "@/components/dashboard/error-banner"
import { StatusIndicator } from "@/components/indicator"
import { backendMediaProxyUrl } from "@/lib/backend-media"
import { decodeRouteParam } from "@/lib/decode-param"
import { formatDateTime } from "@/lib/format"

type User = UserDetailQuery["user"]
type Permission = User["permissions"][number]

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fa: "Persian",
  fr: "French",
  de: "German",
  ar: "Arabic",
}

function clusterPermissions(permissions: Permission[]) {
  const clusters = new Map<string, Permission[]>()

  for (const permission of permissions) {
    const rawCluster = permission.codename.split(".")[0] || "Other"
    const cluster =
      rawCluster
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/Permissions?$/, "")
        .trim() || "Other"
    const grouped = clusters.get(cluster) ?? []
    grouped.push(permission)
    clusters.set(cluster, grouped)
  }

  return [...clusters.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function PermissionList({
  permissions,
  emptyMessage,
}: {
  permissions: Permission[]
  emptyMessage: string
}) {
  if (permissions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {clusterPermissions(permissions).map(([cluster, items]) => (
        <div key={cluster} className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">{cluster}</p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((permission) => (
              <Badge
                key={permission.codename}
                variant="secondary"
                className="font-mono text-[11px]"
                title={permission.codename}
              >
                {permission.name}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function UserDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-24" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  )
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>()
  const id = decodeRouteParam(params.id)

  const [{ data, fetching, error }, reexecute] = useQuery<
    UserDetailQuery,
    UserDetailQueryVariables
  >({
    query: UserDetailDocument,
    variables: { id },
    pause: !id,
  })

  const user = data?.user

  if (fetching && !user) return <UserDetailSkeleton />

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <DetailPageHeader
          backHref="/dashboard/users"
          backLabel="Back to users"
          title="User unavailable"
          subtitle={
            id ? "The user could not be loaded." : "The URL is missing a user id."
          }
        />
        <ErrorBanner
          error={error?.message ?? (!id ? "Missing user id" : "User not found")}
          onRetry={() => reexecute({ requestPolicy: "network-only" })}
        />
      </div>
    )
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ")
  const displayName = name || user.email
  const initial = (user.firstName[0] ?? user.email[0] ?? "?").toUpperCase()
  const avatarUrl = backendMediaProxyUrl(user.avatar?.url)

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader
        backHref="/dashboard/users"
        backLabel="Back to users"
        title={displayName}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span>{user.email}</span>
            <span aria-hidden>·</span>
            <span>
              Joined {formatDateTime(user.dateJoined)}
            </span>
          </div>
        }
        avatar={
          <div className="relative shrink-0">
            <Avatar className="size-14">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-lg">{initial}</AvatarFallback>
            </Avatar>
            {user.onlineStatus ? (
              <span
                aria-hidden
                className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-success ring-2 ring-background"
              />
            ) : null}
          </div>
        }
        badges={
          <>
            <Badge
              variant={user.onlineStatus ? "success" : "secondary"}
              className="gap-1.5"
            >
              <StatusIndicator
                color={user.onlineStatus ? "emerald" : "rose"}
                pulse={user.onlineStatus}
                className="size-1.5"
                aria-hidden
              />
              {user.onlineStatus ? "Online" : "Offline"}
            </Badge>
            <Badge variant={user.isStaff ? "default" : "secondary"}>
              {user.isStaff ? "Staff" : "Member"}
            </Badge>
            <Badge variant={user.isActive ? "success" : "destructive"}>
              {user.isActive ? "Active" : "Disabled"}
            </Badge>
            <Badge variant={user.isConfirmed ? "success" : "warning"}>
              {user.isConfirmed ? "Confirmed" : "Pending"}
            </Badge>
            {user.isSuperuser ? <Badge>Superuser</Badge> : null}
          </>
        }
      />

      <ErrorBanner
        error={error?.message ?? null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="text-muted-foreground" aria-hidden />
                Groups
                <Badge variant="secondary">{user.groups.length}</Badge>
              </CardTitle>
              <CardDescription>
                Groups assigned directly to this user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This user is not a member of any group.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.groups.map((group) => (
                    <Badge key={group.id} variant="outline" className="h-6 px-2.5">
                      {group.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRoundIcon className="text-muted-foreground" aria-hidden />
                Permissions
                <Badge variant="secondary">{user.permissions.length}</Badge>
              </CardTitle>
              <CardDescription>
                Direct permissions granted to this account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionList
                permissions={user.permissions}
                emptyMessage="No direct permissions."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="text-muted-foreground" aria-hidden />
                Group permissions
                <Badge variant="secondary">{user.groupPermissions.length}</Badge>
              </CardTitle>
              <CardDescription>Permissions inherited from groups.</CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionList
                permissions={user.groupPermissions}
                emptyMessage="No inherited group permissions."
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="text-muted-foreground" aria-hidden />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col">
                <InfoRow label="Email">
                  <a
                    href={`mailto:${user.email}`}
                    className="inline-flex items-center gap-1.5 hover:underline"
                  >
                    <MailIcon className="text-muted-foreground" aria-hidden />
                    {user.email}
                  </a>
                </InfoRow>
                <InfoRow label="Language">
                  <span className="inline-flex items-center gap-1.5">
                    <GlobeIcon className="text-muted-foreground" aria-hidden />
                    {LANGUAGE_LABELS[user.languageCode] ??
                      user.languageCode.toUpperCase()}
                  </span>
                </InfoRow>
                <InfoRow label="Joined">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDaysIcon className="text-muted-foreground" aria-hidden />
                    {formatDateTime(user.dateJoined)}
                  </span>
                </InfoRow>
                <InfoRow label="Last login">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="text-muted-foreground" aria-hidden />
                    {user.lastLogin ? formatDateTime(user.lastLogin) : "Never"}
                  </span>
                </InfoRow>
                <InfoRow label="Updated">
                  {formatDateTime(user.updatedAt)}
                </InfoRow>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {user.description ? (
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {user.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonMetadata value={user.metadata} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
