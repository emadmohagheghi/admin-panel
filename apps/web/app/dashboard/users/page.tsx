"use client"

// Users table — server-side cursor pagination, client-side sort/search on the
// current page, status badges.
import { useMemo, useState } from "react"
import { useQuery } from "urql"
import type { ColumnDef } from "@tanstack/react-table"
import { UsersListDocument, type UsersListQuery } from "@workspace/graphql"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { DataTable } from "@/components/dashboard/data-table"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { formatDateTime } from "@/lib/format"

type UserNode = NonNullable<UsersListQuery["users"]>["edges"][number]["node"]

const PAGE_SIZE = 20

function UserCell({ user }: { user: UserNode }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ")
  const initial = (user.firstName[0] ?? user.email[0] ?? "?").toUpperCase()
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="size-7">
        {user.avatar?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- image hosts are not fixed
          <img src={user.avatar.url} alt="" className="size-full object-cover" />
        ) : (
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        )}
      </Avatar>
      {user.onlineStatus && <span className="sr-only">Online</span>}
      <span
        aria-hidden
        className={
          user.onlineStatus
            ? "bg-emerald-500 relative -ml-4 size-2.5 rounded-full ring-2 ring-background"
            : "hidden"
        }
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name || "—"}</p>
        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { cursor, canGoBack, goNext, goBack } = useCursorPagination()
  const [search, setSearch] = useState("")

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: UsersListDocument,
    variables: {
      first: PAGE_SIZE,
      after: cursor,
      filters: null,
      ordering: [],
    },
  })

  const users = useMemo(() => (data?.users?.edges ?? []).map((e) => e.node), [data])

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.trim().toLowerCase()
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q),
    )
  }, [users, search])

  const columns = useMemo<ColumnDef<UserNode, unknown>[]>(
    () => [
      {
        accessorFn: (row) => `${row.firstName} ${row.lastName} ${row.email}`,
        id: "user",
        header: "User",
        cell: (ctx) => <UserCell user={ctx.row.original} />,
      },
      {
        accessorKey: "isStaff",
        header: "Role",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "default" : "secondary"}>
            {ctx.getValue() ? "Staff" : "Member"}
          </Badge>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "destructive"}>
            {ctx.getValue() ? "Active" : "Disabled"}
          </Badge>
        ),
      },
      {
        accessorKey: "isConfirmed",
        header: "Confirmed",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "warning"}>
            {ctx.getValue() ? "Confirmed" : "Pending"}
          </Badge>
        ),
      },
      {
        accessorKey: "lastLogin",
        header: "Last login",
        cell: (ctx) => (
          <span className="text-muted-foreground text-xs">{formatDateTime(ctx.row.original.lastLogin)}</span>
        ),
      },
      {
        accessorKey: "dateJoined",
        header: "Joined",
        cell: (ctx) => (
          <span className="text-muted-foreground text-xs">{formatDateTime(ctx.row.original.dateJoined)}</span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          Store users — sorting and search apply to the current page.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={fetching && !data}
        error={error ? error.message : null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
        emptyMessage={search ? "No users match your search" : "No users yet"}
        pagination={{
          hasNextPage: data?.users?.pageInfo.hasNextPage ?? false,
          hasPreviousPage: canGoBack || (data?.users?.pageInfo.hasPreviousPage ?? false),
          onNext: () => {
            const end = data?.users?.pageInfo.endCursor
            if (end) goNext(end)
          },
          onPrevious: goBack,
        }}
        totalCount={data?.users?.totalCount ?? null}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name or email…"
      />
    </div>
  )
}
