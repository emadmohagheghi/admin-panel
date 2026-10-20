"use client"

// Users table — server-side email search, boolean filters (isActive,
// isConfirmed, isStaff, isSuperuser), online-first ordering, and cursor
// pagination. The radial breakdown card above toggles the same filters.
import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "urql"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

import {
  UsersListDocument,
  type UserFilterType,
  type UserOrderType,
  type UsersListQuery,
} from "@workspace/graphql"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  USER_BOOLEAN_FILTERS,
  UserFiltersChart,
  type UserBooleanFilter,
  type UserBooleanFilterState,
} from "@/components/charts/user-filters-chart"
import { DataTable } from "@/components/dashboard/data-table"
import { StatusIndicator } from "@/components/indicator"
import { backendMediaProxyUrl } from "@/lib/backend-media"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { useOnlineCount } from "@/hooks/use-online-count"
import { formatDateTime } from "@/lib/format"

type UserNode = NonNullable<UsersListQuery["users"]>["edges"][number]["node"]

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

const BOOLEAN_FILTER_ITEMS = [
  { value: "any", label: "Any" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
]

const NO_FILTERS: UserBooleanFilterState = {
  isActive: null,
  isConfirmed: null,
  isStaff: null,
  isSuperuser: null,
}

function filterValue(value: boolean | null): string {
  if (value === null) return "any"
  return value ? "true" : "false"
}

function UserCell({ user }: { user: UserNode }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ")
  const initial = (user.firstName[0] ?? user.email[0] ?? "?").toUpperCase()
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative shrink-0">
        <Avatar className="size-7">
          {user.avatar?.url ? (
            <AvatarImage
              src={backendMediaProxyUrl(user.avatar.url) ?? undefined}
              alt=""
            />
          ) : null}
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
        {user.onlineStatus ? (
          <>
            <span
              aria-hidden
              className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-success ring-2 ring-background"
            />
            <span className="sr-only">Online</span>
          </>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name || "—"}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { cursor, canGoBack, goNext, goBack, reset, page } =
    useCursorPagination()
  const online = useOnlineCount()

  const [filters, setFilters] = useState<UserBooleanFilterState>(NO_FILTERS)
  const [onlineFirst, setOnlineFirst] = useState(false)
  // Search is server-side: the input updates instantly, the committed value
  // (and a cursor reset) follows after a short debounce.
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    },
    []
  )

  const hasActiveFilters = USER_BOOLEAN_FILTERS.some(
    (filter) => filters[filter.key] !== null
  )

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value.trim())
      reset()
    }, SEARCH_DEBOUNCE_MS)
  }

  function updateFilter(key: UserBooleanFilter, value: boolean | null) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    reset()
  }

  function toggleFilter(key: UserBooleanFilter) {
    setFilters((prev) => ({ ...prev, [key]: prev[key] === null ? true : null }))
    reset()
  }

  function clearFilters() {
    setFilters(NO_FILTERS)
    setOnlineFirst(false)
    reset()
  }

  function toggleOnlineFirst() {
    setOnlineFirst((value) => !value)
    reset()
  }

  const gqlFilters = useMemo<UserFilterType | null>(() => {
    const result: UserFilterType = {}
    if (search) result.email = { contains: search }
    for (const { key } of USER_BOOLEAN_FILTERS) {
      const value = filters[key]
      if (value !== null) result[key] = { exact: value }
    }
    return Object.keys(result).length > 0 ? result : null
  }, [filters, search])

  const gqlOrdering = useMemo<UserOrderType[]>(
    () => (onlineFirst ? [{ onlineStatus: true }] : []),
    [onlineFirst]
  )

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: UsersListDocument,
    variables: {
      first: PAGE_SIZE,
      after: cursor,
      filters: gqlFilters,
      ordering: gqlOrdering,
    },
  })

  const users = useMemo(
    () => (data?.users?.edges ?? []).map((edge) => edge.node),
    [data]
  )

  const columns = useMemo<ColumnDef<UserNode, unknown>[]>(
    () => [
      {
        accessorFn: (row) => `${row.firstName} ${row.lastName} ${row.email}`,
        id: "user",
        header: "User",
        // Avatar + name/email stack → 36px content; keeps skeleton rows at the
        // exact loaded row height (default h-5 fits single-line columns).
        meta: { skeletonClassName: "h-9" },
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
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDateTime(ctx.row.original.lastLogin)}
          </span>
        ),
      },
      {
        accessorKey: "dateJoined",
        header: "Joined",
        cell: (ctx) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDateTime(ctx.row.original.dateJoined)}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <Badge variant="secondary" className="gap-1.5">
            <StatusIndicator
              color={online.error ? "rose" : "emerald"}
              pulse={!online.error}
              className="size-1.5"
              aria-hidden
            />
            <span className="tabular-nums">{online.count ?? "—"}</span>
            <span>online</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Store users — email search, boolean filters, and online-first ordering
          run on the server.
        </p>
      </div>

      <UserFiltersChart filters={filters} onToggle={toggleFilter} />

      <DataTable
        columns={columns}
        data={users}
        loading={fetching && !data}
        fetching={fetching}
        error={error ? error.message : null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
        emptyMessage={
          hasActiveFilters || search
            ? "No users match the current filters"
            : "No users yet"
        }
        pagination={{
          hasNextPage: data?.users?.pageInfo.hasNextPage ?? false,
          hasPreviousPage:
            canGoBack || (data?.users?.pageInfo.hasPreviousPage ?? false),
          page,
          onNext: () => {
            const end = data?.users?.pageInfo.endCursor
            if (end) goNext(end)
          },
          onPrevious: goBack,
        }}
        totalCount={data?.users?.totalCount ?? null}
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search email…"
        toolbar={
          <>
            {USER_BOOLEAN_FILTERS.map((filter) => (
              <Select
                key={filter.key}
                value={filterValue(filters[filter.key])}
                items={BOOLEAN_FILTER_ITEMS}
                onValueChange={(value) =>
                  updateFilter(
                    filter.key,
                    value === "true" ? true : value === "false" ? false : null
                  )
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-36"
                  aria-label={`Filter by ${filter.label}`}
                >
                  <span className="text-muted-foreground">{filter.label}:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            ))}
            <Button
              type="button"
              size="sm"
              variant={onlineFirst ? "default" : "outline"}
              aria-pressed={onlineFirst}
              onClick={toggleOnlineFirst}
            >
              <ArrowUpDown data-icon="inline-start" aria-hidden />
              Online first
            </Button>
            {(hasActiveFilters || onlineFirst) && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </>
        }
      />
    </div>
  )
}
