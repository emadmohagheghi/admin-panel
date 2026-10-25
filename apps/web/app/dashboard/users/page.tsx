"use client"

// Users table — server-side email search, boolean filters (isActive,
// isConfirmed, isStaff, isSuperuser), sorting, online-first default ordering,
// plus cursor pagination and infinite scroll. The radial breakdown card above
// toggles the same filters.
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useQuery } from "urql"
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"

import {
  Ordering,
  UsersListDocument,
  type UserFilterType,
  type UserOrderType,
  type UsersListQuery,
  type UsersListQueryVariables,
} from "@workspace/graphql"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  USER_BOOLEAN_FILTERS,
  UserFiltersChart,
  type UserBooleanFilter,
  type UserBooleanFilterState,
} from "@/components/charts/user-filters-chart"
import { DataTable } from "@/components/dashboard/data-table"
import { StatusIndicator } from "@/components/indicator"
import { useOnlinePresence } from "@/components/online-presence"
import { backendMediaProxyUrl } from "@/lib/backend-media"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { formatDateTime } from "@/lib/format"

type UserEdge = NonNullable<UsersListQuery["users"]>["edges"][number]
type UserNode = UserEdge["node"]
type UsersViewMode = "scroll" | "infinity"
type InfiniteUsersState = {
  edges: UserEdge[]
  hasNextPage: boolean
  endCursor: string | null
  totalCount: number | null
}

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const USERS_ORDERING: UserOrderType[] = [{ onlineStatus: true }]

/**
 * UserOrderType only exposes these orderable fields. The boolean columns
 * (role/status/confirmed) stay unsortable instead of sorting just the loaded
 * page. Clearing the header sort falls back to the online-first default.
 */
function usersOrdering(sorting: SortingState): UserOrderType[] {
  const sort = sorting[0]
  if (!sort) return USERS_ORDERING

  switch (sort.id) {
    case "user": {
      const direction = sort.desc ? Ordering.Desc : Ordering.Asc
      return [{ firstName: direction }, { lastName: direction }]
    }
    case "lastLogin":
      return [
        {
          lastLogin: sort.desc ? Ordering.DescNullsLast : Ordering.AscNullsLast,
        },
      ]
    case "dateJoined":
      return [{ dateJoined: sort.desc ? Ordering.Desc : Ordering.Asc }]
    default:
      return USERS_ORDERING
  }
}

const NO_FILTERS: UserBooleanFilterState = {
  isActive: false,
  isConfirmed: false,
  isStaff: false,
  isSuperuser: false,
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
      <Link
        href={`/dashboard/users/${user.id}`}
        className="min-w-0 rounded-sm outline-none hover:underline focus-visible:ring-3"
      >
        <p className="truncate text-sm font-medium">{name || "—"}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </Link>
    </div>
  )
}

export default function UsersPage() {
  const { cursor, canGoBack, goNext, goBack, reset, page } =
    useCursorPagination()
  const online = useOnlinePresence()

  const [filters, setFilters] = useState<UserBooleanFilterState>(NO_FILTERS)
  const [viewMode, setViewMode] = useState<UsersViewMode>("scroll")
  const [sorting, setSorting] = useState<SortingState>([])
  const [infinite, setInfinite] = useState<InfiniteUsersState | null>(null)
  const [infiniteCursor, setInfiniteCursor] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
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
    (filter) => filters[filter.key]
  )

  function resetInfinite() {
    setInfinite(null)
    setInfiniteCursor(null)
  }

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      const next = value.trim()
      if (next === search) return
      setSearch(next)
      resetInfinite()
      reset()
    }, SEARCH_DEBOUNCE_MS)
  }

  function toggleFilter(key: UserBooleanFilter) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
    resetInfinite()
    reset()
  }

  function clearFilters() {
    setFilters(NO_FILTERS)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setSearchInput("")
    setSearch("")
    resetInfinite()
    reset()
  }

  function changeViewMode(next: UsersViewMode) {
    if (next === viewMode) return
    setViewMode(next)
    resetInfinite()
    reset()
  }

  function handleSortingChange(updater: Updater<SortingState>) {
    setSorting(updater)
    resetInfinite()
    reset()
  }

  const gqlFilters = useMemo<UserFilterType | null>(() => {
    const result: UserFilterType = {}
    if (search) result.email = { contains: search }
    for (const { key } of USER_BOOLEAN_FILTERS) {
      if (filters[key]) result[key] = { exact: true }
    }
    return Object.keys(result).length > 0 ? result : null
  }, [filters, search])

  const ordering = useMemo(() => usersOrdering(sorting), [sorting])

  const [{ data, fetching, error }, reexecute] = useQuery<
    UsersListQuery,
    UsersListQueryVariables
  >({
    query: UsersListDocument,
    requestPolicy: "cache-first",
    variables: {
      first: PAGE_SIZE,
      after: viewMode === "infinity" ? infiniteCursor : cursor,
      filters: gqlFilters,
      ordering,
    },
  })

  const scrollHasNextPage = data?.users?.pageInfo.hasNextPage ?? false
  const infiniteHasNextPage = infinite?.hasNextPage ?? scrollHasNextPage
  const dataEndCursor = data?.users?.pageInfo.endCursor ?? null
  const pageAppended = infinite !== null && infinite.endCursor === dataEndCursor
  const loadingMore = viewMode === "infinity" && fetching && infinite !== null
  const listLoading = (fetching && !loadingMore) || (!data && !error)

  useEffect(() => {
    if (viewMode !== "infinity" || fetching || error) return
    const page = data?.users
    if (!page) return
    const endCursor = page.pageInfo.endCursor ?? null

    setInfinite((prev) => {
      if (!prev) {
        return {
          edges: page.edges,
          hasNextPage: page.pageInfo.hasNextPage,
          endCursor,
          totalCount: page.totalCount,
        }
      }

      const seen = new Set(prev.edges.map((edge) => edge.cursor))
      const additions = page.edges.filter((edge) => !seen.has(edge.cursor))
      const nextEdges = additions.length
        ? [...prev.edges, ...additions]
        : prev.edges

      if (
        nextEdges === prev.edges &&
        prev.hasNextPage === page.pageInfo.hasNextPage &&
        prev.endCursor === endCursor &&
        prev.totalCount === page.totalCount
      ) {
        return prev
      }

      return {
        edges: nextEdges,
        hasNextPage: page.pageInfo.hasNextPage,
        endCursor,
        totalCount: page.totalCount,
      }
    })
  }, [viewMode, fetching, error, data])

  useEffect(() => {
    if (
      viewMode !== "infinity" ||
      fetching ||
      error ||
      !infiniteHasNextPage ||
      !pageAppended ||
      infinite?.endCursor == null
    ) {
      return
    }

    const sentinel = loadMoreRef.current
    if (!sentinel) return

    const nextCursor = infinite.endCursor
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInfiniteCursor(nextCursor)
        }
      },
      { rootMargin: "240px 0px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    viewMode,
    fetching,
    error,
    infiniteHasNextPage,
    pageAppended,
    infinite?.endCursor,
  ])

  const users = useMemo(() => {
    const edges =
      viewMode === "infinity"
        ? (infinite?.edges ?? data?.users?.edges ?? [])
        : (data?.users?.edges ?? [])
    return edges.map((edge) => edge.node)
  }, [viewMode, infinite, data])

  const totalCount =
    viewMode === "infinity"
      ? (infinite?.totalCount ?? data?.users?.totalCount ?? null)
      : (data?.users?.totalCount ?? null)

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
        enableSorting: false,
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "default" : "secondary"}>
            {ctx.getValue() ? "Staff" : "Member"}
          </Badge>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        enableSorting: false,
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "destructive"}>
            {ctx.getValue() ? "Active" : "Disabled"}
          </Badge>
        ),
      },
      {
        accessorKey: "isConfirmed",
        header: "Confirmed",
        enableSorting: false,
        cell: (ctx) => (
          <Badge variant={ctx.getValue() ? "success" : "warning"}>
            {ctx.getValue() ? "Confirmed" : "Pending"}
          </Badge>
        ),
      },
      {
        accessorKey: "lastLogin",
        header: "Last login",
        sortDescFirst: true,
        cell: (ctx) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDateTime(ctx.row.original.lastLogin)}
          </span>
        ),
      },
      {
        accessorKey: "dateJoined",
        header: "Joined",
        sortDescFirst: true,
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
          Store users — email search, boolean filters, and sorting run on the
          server.
        </p>
      </div>

      <UserFiltersChart filters={filters} onToggle={toggleFilter} />

      <DataTable
        columns={columns}
        data={users}
        loading={listLoading}
        fetching={fetching}
        error={error ? error.message : null}
        onRetry={() => reexecute({ requestPolicy: "network-only" })}
        manualSorting
        sorting={sorting}
        onSortingChange={handleSortingChange}
        emptyMessage={
          search
            ? `No results for "${search}"`
            : hasActiveFilters
              ? "No users match the active filters"
              : "No users yet"
        }
        pagination={
          viewMode === "scroll"
            ? {
                hasNextPage: scrollHasNextPage,
                hasPreviousPage:
                  canGoBack || (data?.users?.pageInfo.hasPreviousPage ?? false),
                page,
                onNext: () => {
                  const end = data?.users?.pageInfo.endCursor
                  if (end) goNext(end)
                },
                onPrevious: goBack,
              }
            : undefined
        }
        totalCount={totalCount}
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search email…"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">View mode</span>
              <div
                data-slot="button-group"
                role="group"
                aria-label="View mode"
                className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "scroll" ? "secondary" : "ghost"}
                  aria-pressed={viewMode === "scroll"}
                  onClick={() => changeViewMode("scroll")}
                  className="h-7 px-2 text-xs"
                >
                  Scroll mode
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "infinity" ? "secondary" : "ghost"}
                  aria-pressed={viewMode === "infinity"}
                  onClick={() => changeViewMode("infinity")}
                  className="h-7 px-2 text-xs"
                >
                  Infinity mode
                </Button>
              </div>
            </div>
            {hasActiveFilters || search ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        }
      />

      {viewMode === "infinity" && !listLoading && users.length > 0 ? (
        <div
          ref={loadMoreRef}
          className="flex h-10 items-center justify-center gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          {loadingMore ? (
            <>
              <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden />
              <span>Loading more…</span>
            </>
          ) : infiniteHasNextPage ? (
            <span>Scroll for more</span>
          ) : (
            <span>All results loaded</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
