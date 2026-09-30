"use client"

// جدول کاربران — صفحه‌بندی cursor سروری، سورت کلاینت‌ساید روی صفحه‌ی جاری
// (سرستون‌ها)، جستجوی کلاینت‌ساید روی صفحه‌ی جاری و بج‌های وضعیت.
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
  const initial = (user.firstName[0] ?? user.email[0] ?? "؟").toUpperCase()
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="size-7">
        {user.avatar?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- دامنه‌ی تصاویر خارجی ثابت نیست
          <img src={user.avatar.url} alt="" className="size-full object-cover" />
        ) : (
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        )}
      </Avatar>
      {user.onlineStatus && (
        <span className="sr-only">آنلاین</span>
      )}
      <span
        aria-hidden
        className={
          user.onlineStatus
            ? "bg-emerald-500 relative -ms-4 size-2.5 rounded-full ring-2 ring-background"
            : "hidden"
        }
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name || "—"}</p>
        <p dir="ltr" className="text-muted-foreground truncate text-xs">
          {user.email}
        </p>
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

  const users = useMemo(
    () => (data?.users?.edges ?? []).map((e) => e.node),
    [data],
  )

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
        header: "کاربر",
        cell: (ctx) => <UserCell user={ctx.row.original} />,
      },
      {
        accessorKey: "isStaff",
        header: "نقش",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "default" : "secondary"}>
            {ctx.getValue() ? "ستاف" : "معمولی"}
          </Badge>
        ),
      },
      {
        accessorKey: "isActive",
        header: "وضعیت",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "destructive"}>
            {ctx.getValue() ? "فعال" : "غیرفعال"}
          </Badge>
        ),
      },
      {
        accessorKey: "isConfirmed",
        header: "تأیید",
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "warning"}>
            {ctx.getValue() ? "تأییدشده" : "در انتظار"}
          </Badge>
        ),
      },
      {
        accessorKey: "lastLogin",
        header: "آخرین ورود",
        cell: (ctx) => (
          <span className="text-muted-foreground text-xs">{formatDateTime(ctx.row.original.lastLogin)}</span>
        ),
      },
      {
        accessorKey: "dateJoined",
        header: "عضویت",
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
        <h1 className="text-2xl font-bold tracking-tight">کاربران</h1>
        <p className="text-muted-foreground text-sm">
          فهرست کاربران فروشگاه — مرتب‌سازی و جستجو روی صفحه‌ی جاری اعمال می‌شود.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={fetching && !data}
        error={error ? error.message : null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
        emptyMessage={search ? "کاربری مطابق جستجو پیدا نشد" : "هنوز کاربری ثبت نشده"}
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
        searchPlaceholder="جستجوی نام یا ایمیل…"
      />
    </div>
  )
}
