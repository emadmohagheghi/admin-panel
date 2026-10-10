"use client"

// Categories page — recursive tree with lazy-expanding children + server-side search.
// Roots preload two levels; deeper levels lazy-load per node via CategoryDetail,
// so the tree renders to any depth with continuous guide lines per level.
// Searching switches to the flat filtered list (cursor-paginated).
import { useMemo, useState } from "react"
import { useQuery } from "urql"
import { ChevronDown, ChevronRight, FolderOpen, List, Search, TreeDeciduous } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import {
  CategoriesListDocument,
  CategoryDetailDocument,
  RootCategoriesTreeDocument,
  type CategoryDetailQuery,
} from "@workspace/graphql"

import { ErrorBanner } from "@/components/dashboard/error-banner"
import { formatDateTime } from "@/lib/format"

type DetailChild = Extract<CategoryDetailQuery["node"], { __typename: "CategoryType" }>["children"][number]

// Minimal structural shape for preloaded children at any depth (root children
// carry description + nested children; grandchildren are shallower).
type PreloadedEntry = {
  id: string
  name: string
  slug: string
  isPublic: boolean
  numchild: number
  children?: PreloadedEntry[] | null
}

// Normalized tree node — `children` is set only when actually loaded; deeper
// levels lazy-load via CategoryDetail on expand, so the tree renders to any depth.
type TreeNodeData = {
  id: string
  name: string
  slug: string
  isPublic: boolean
  numchild: number
  updatedAt?: string | null
  children?: TreeNodeData[]
}

function normalizePreloaded(children: PreloadedEntry[]): TreeNodeData[] {
  return children.map((c) => {
    const kids = normalizePreloaded(c.children ?? [])
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      isPublic: c.isPublic,
      numchild: c.numchild,
      children: kids.length > 0 ? kids : undefined,
    }
  })
}

function normalizeDetail(children: DetailChild[]): TreeNodeData[] {
  return children.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    isPublic: c.isPublic,
    numchild: c.numchild,
    children: undefined,
  }))
}

function PublicBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <Badge variant={isPublic ? "success" : "warning"} className="shrink-0">
      {isPublic ? "Public" : "Hidden"}
    </Badge>
  )
}

function NameCell({
  node,
  depth,
  expanded,
  hasChildren,
  onToggle,
}: {
  node: { name: string; slug: string }
  depth: number
  expanded?: boolean
  hasChildren?: boolean
  onToggle?: () => void
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-1.5"
      style={{ paddingInlineStart: `${depth * 1.25}rem` }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          className="text-muted-foreground hover:text-foreground hover:bg-accent -m-1 flex size-5 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-3"
        >
          {expanded ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden />
          )}
        </button>
      ) : (
        <span className="size-5 shrink-0" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{node.name}</p>
        <p className="text-muted-foreground truncate font-mono text-xs">{node.slug}</p>
      </div>
    </div>
  )
}

// Vertical guide lines — one per ancestor level (LTR: lines grow leftward as
// depth grows). Rendered as a direct stretched child of the row so the line
// spans the row's full height (including padding) and joins seamlessly with
// the rows above and below into one continuous spine, like the reference.
function DepthGuides({ depth }: { depth: number }) {
  if (depth === 0) return null
  return (
    <span className="flex shrink-0 items-stretch self-stretch" aria-hidden>
      {Array.from({ length: depth }, (_, i) => (
        <span key={i} className="flex w-5 items-stretch justify-center">
          <span className="border-border border-s border-dashed" />
        </span>
      ))}
    </span>
  )
}

// One recursive tree node — expands inline; children come from the preloaded
// query when available, otherwise they lazy-load via CategoryDetail on expand.
function TreeNode({ node, depth }: { node: TreeNodeData; depth: number }) {
  const [expanded, setExpanded] = useState(false)
  const preloaded = node.children
  const hasChildren = node.numchild > 0

  const [{ data: detailData, fetching: detailFetching }] = useQuery({
    query: CategoryDetailDocument,
    variables: { id: node.id },
    pause: !expanded || preloaded !== undefined || !hasChildren,
  })
  const detailNode =
    detailData?.node?.__typename === "CategoryType" ? detailData.node : null
  const children = preloaded ?? (detailNode ? normalizeDetail(detailNode.children) : [])

  return (
    <>
      <div
        role="treeitem"
        aria-level={depth + 1}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-label={`${node.name} (level ${depth + 1})`}
        className={cn(
          "hover:bg-muted/40 flex items-stretch justify-between gap-3 px-3",
          depth === 0 && "border-b last:border-b-0 first:border-t",
        )}
      >
        <DepthGuides depth={depth} />
        <div className="flex min-w-0 flex-1 items-center py-2.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                className="text-muted-foreground hover:text-foreground hover:bg-accent -m-1 flex size-5 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-3"
              >
                <ChevronDown
                  className={cn("size-3.5 transition-transform duration-200", !expanded && "-rotate-90")}
                  aria-hidden
                />
              </button>
            ) : (
              <span className="size-5 shrink-0" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{node.name}</p>
              <p className="text-muted-foreground truncate font-mono text-xs">{node.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {node.updatedAt && (
            <span className="text-muted-foreground hidden text-xs tabular-nums sm:inline">
              {formatDateTime(node.updatedAt)}
            </span>
          )}
          {hasChildren && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {node.numchild} sub
            </span>
          )}
          <PublicBadge isPublic={node.isPublic} />
        </div>
      </div>
      {/* Smooth expand/collapse: grid-rows animates height; content stays
      mounted while open so lazy-loaded children don't refetch on re-open. */}
      <div
        className={cn(
          "bg-muted/20 grid transition-[grid-template-rows] duration-200 ease-out",
          expanded && hasChildren ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        role="group"
        aria-label={`Subcategories of ${node.name}`}
        aria-hidden={!expanded || !hasChildren}
      >
        <div className="min-h-0 overflow-hidden">
          {detailFetching && preloaded === undefined ? (
            <div className="flex items-stretch px-3">
              <DepthGuides depth={depth + 1} />
              <div className="flex items-center gap-2 py-2.5">
                <Skeleton className="h-4 w-40" aria-hidden />
                <span className="text-muted-foreground text-xs">Loading…</span>
              </div>
            </div>
          ) : children.length > 0 ? (
            children.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} />)
          ) : (
            expanded && (
              <div className="flex items-stretch px-3">
                <DepthGuides depth={depth + 1} />
                <span className="text-muted-foreground py-2.5 text-xs">No subcategories found</span>
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}

export default function CategoriesPage() {
  const [mode, setMode] = useState<"tree" | "search">("tree")
  const [search, setSearch] = useState("")

  // screen tree data — 8 roots ship with two levels of children each
  const [{ data: treeData, fetching: treeFetching, error: treeError }, refetchTree] = useQuery({
    query: RootCategoriesTreeDocument,
    variables: { first: 20 },
  })

  // search mode: server-side filtered flat list
  const [{ data: listData, fetching: listFetching, error: listError }, refetchList] = useQuery({
    query: CategoriesListDocument,
    variables: {
      first: 20,
      filters: search.trim() ? { name: { iContains: search.trim() } } : null,
      ordering: [],
    },
    pause: mode !== "search",
  })

  const roots = useMemo<TreeNodeData[]>(
    () =>
      (treeData?.rootCategories?.edges ?? []).map((e) => ({
        id: e.node.id,
        name: e.node.name,
        slug: e.node.slug,
        isPublic: e.node.isPublic,
        numchild: e.node.numchild,
        updatedAt: e.node.updatedAt,
        children: (() => {
          const kids = normalizePreloaded(e.node.children ?? [])
          return kids.length > 0 ? kids : undefined
        })(),
      })),
    [treeData],
  )
  const listRows = useMemo(() => (listData?.categories?.edges ?? []).map((e) => e.node), [listData])

  const error = mode === "tree" ? treeError : listError
  const onRetry =
    mode === "tree"
      ? () => refetchTree({ requestPolicy: "network-only" })
      : () => refetchList({ requestPolicy: "network-only" })
  const loading = mode === "tree" ? treeFetching && !treeData : listFetching && !listData

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-sm">
          Store category tree — {treeData?.rootCategories?.totalCount ?? "…"} roots,{" "}
          {listData?.categories?.totalCount ?? "…"} total.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setMode("search")
            }}
            onFocus={() => setMode("search")}
            placeholder="Search by name — server-side…"
            aria-label="Search categories by name"
            className="ps-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1" role="tablist" aria-label="View mode">
          <Button
            type="button"
            variant={mode === "tree" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("tree")}
            role="tab"
            aria-selected={mode === "tree"}
          >
            <TreeDeciduous aria-hidden data-icon="inline-start" />
            Tree
          </Button>
          <Button
            type="button"
            variant={mode === "search" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("search")}
            role="tab"
            aria-selected={mode === "search"}
          >
            <List aria-hidden data-icon="inline-start" />
            Flat list
          </Button>
        </div>
        {mode === "search" && search.trim() && (
          <span className="text-muted-foreground text-sm" aria-live="polite">
            {listData?.categories?.totalCount ?? "…"} matches for{" "}
            <span className="text-foreground font-medium">“{search.trim()}”</span>
          </span>
        )}
      </div>

      <ErrorBanner error={error ? error.message : null} onRetry={onRetry} toastPrefix="Failed to load categories" />

      <div className="bg-card shadow-xs overflow-hidden rounded-xl border">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-3">
                <div className="flex items-center gap-2" style={{ paddingInlineStart: `${(i % 3) * 1.25}rem` }}>
                  <Skeleton className="size-5 rounded-sm" aria-hidden />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" aria-hidden />
                    <Skeleton className="h-3 w-24" aria-hidden />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" aria-hidden />
              </div>
            ))}
          </div>
        ) : mode === "tree" ? (
          <div role="tree" aria-label="Category tree">
            {roots.map((root) => (
              <TreeNode key={root.id} node={root} depth={0} />
            ))}
            {roots.length === 0 && (
              <div className="text-muted-foreground py-16 text-center text-sm">No categories yet</div>
            )}
          </div>
        ) : (
          <div role="table" aria-label="Flat category list">
            {listRows.map((row) => (
              <div
                key={row.id}
                className="hover:bg-muted/40 flex items-center justify-between gap-3 border-b px-3 py-2.5 last:border-b-0"
              >
                <NameCell node={row} depth={0} />
                <div className="flex shrink-0 items-center gap-2">
                  {row.numchild > 0 && (
                    <span className="text-muted-foreground text-xs tabular-nums">{row.numchild} sub</span>
                  )}
                  <PublicBadge isPublic={row.isPublic} />
                </div>
              </div>
            ))}
            {listRows.length === 0 && (
              <div className="text-muted-foreground py-16 text-center text-sm">
                {search.trim() ? `No categories match “${search.trim()}”` : "No categories yet"}
              </div>
            )}
          </div>
        )}
      </div>

      {mode === "search" && search.trim() && (
        <p className="text-muted-foreground text-center text-xs">
          Showing the first 20 server-filtered matches; the backend caps pages at 20 — refine the search to narrow further.
        </p>
      )}

      {mode === "tree" && (
        <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-center text-xs">
          <FolderOpen className="size-3.5" aria-hidden />
          Click a category to expand — children load on demand, the continuous guide lines show the depth
        </p>
      )}
    </div>
  )
}
