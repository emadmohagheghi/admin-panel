"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "urql"
import {
  FolderTreeIcon,
  PackageIcon,
  TagsIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  CategoryPageDocument,
  type CategoryPageQuery,
  type CategoryPageQueryVariables,
} from "@workspace/graphql"

import {
  DetailPageHeader,
  InfoRow,
  JsonMetadata,
} from "@/components/dashboard/detail"
import { ErrorBanner } from "@/components/dashboard/error-banner"
import { decodeRouteParam } from "@/lib/decode-param"
import { formatDateTime, orDash } from "@/lib/format"

type Category = CategoryPageQuery["categories"]["edges"][number]["node"]
type ChildCategory = Category["children"][number]
type CategoryProduct = Category["products"][number]

const PRODUCT_PREVIEW_LIMIT = 24

function CategoryBreadcrumbs({ category }: { category: Category }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/dashboard/categories" />}>
            Categories
          </BreadcrumbLink>
        </BreadcrumbItem>
        {category.ancestors.map((ancestor) => (
          <BreadcrumbItem key={ancestor.id}>
            <BreadcrumbSeparator />
            <BreadcrumbLink
              render={<Link href={`/dashboard/categories/${ancestor.id}`} />}
            >
              {ancestor.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
        ))}
        <BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>{category.name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function ChildCategories({ items }: { items: ChildCategory[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This category has no direct subcategories.
      </p>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((child) => (
        <Link
          key={child.id}
          href={`/dashboard/categories/${child.id}`}
          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50"
        >
          <div className="flex min-w-0 items-center gap-2">
            <FolderTreeIcon className="shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{child.name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {child.slug}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {child.numchild > 0 ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {child.numchild} sub
              </span>
            ) : null}
            <Badge variant={child.isPublic ? "success" : "warning"}>
              {child.isPublic ? "Public" : "Hidden"}
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  )
}

function CategoryProducts({ products }: { products: CategoryProduct[] }) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No products are assigned to this category.
      </p>
    )
  }

  const shown = products.slice(0, PRODUCT_PREVIEW_LIMIT)

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="flex flex-col rounded-sm outline-none hover:underline focus-visible:ring-3"
                >
                  <span className="font-medium">{product.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {product.slug}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={product.isPublic ? "success" : "warning"}>
                  {product.isPublic ? "Public" : "Hidden"}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground tabular-nums">
                {formatDateTime(product.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {products.length > shown.length ? (
        <p className="text-xs text-muted-foreground">
          Showing {shown.length} of {products.length} products.
        </p>
      ) : null}
    </div>
  )
}

function CategoryDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  )
}

export default function CategoryDetailPage() {
  const params = useParams<{ id: string }>()
  const id = decodeRouteParam(params.id)

  const [{ data, fetching, error }, reexecute] = useQuery<
    CategoryPageQuery,
    CategoryPageQueryVariables
  >({
    query: CategoryPageDocument,
    variables: { id },
    pause: !id,
  })

  const category = data?.categories.edges[0]?.node

  if (fetching && !category) return <CategoryDetailSkeleton />

  if (!category) {
    return (
      <div className="flex flex-col gap-6">
        <DetailPageHeader
          backHref="/dashboard/categories"
          backLabel="Back to categories"
          title="Category unavailable"
          subtitle={
            id
              ? "The category could not be loaded."
              : "The URL is missing a category id."
          }
        />
        <ErrorBanner
          error={
            error?.message ?? (!id ? "Missing category id" : "Category not found")
          }
          onRetry={() => reexecute({ requestPolicy: "network-only" })}
        />
      </div>
    )
  }

  const parent = category.ancestors.at(-1)

  return (
    <div className="flex flex-col gap-6">
      <CategoryBreadcrumbs category={category} />

      <DetailPageHeader
        backHref="/dashboard/categories"
        backLabel="Back to categories"
        title={category.name}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{category.slug}</span>
            <span aria-hidden>·</span>
            <span>{category.children.length} direct children</span>
            <span aria-hidden>·</span>
            <span>{category.products.length} products</span>
          </div>
        }
        badges={
          <>
            <Badge variant={category.isPublic ? "success" : "warning"}>
              {category.isPublic ? "Public" : "Hidden"}
            </Badge>
            {category.ancestors.length === 0 ? (
              <Badge variant="secondary">Root category</Badge>
            ) : null}
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
              <CardTitle>Description</CardTitle>
              <CardDescription>
                The storefront-facing category copy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {category.description ? (
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {category.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTreeIcon className="text-muted-foreground" aria-hidden />
                Subcategories
                <Badge variant="secondary">{category.children.length}</Badge>
              </CardTitle>
              <CardDescription>
                Direct children of this category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChildCategories items={category.children} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="text-muted-foreground" aria-hidden />
                Products
                <Badge variant="secondary">
                  {category.products.length.toLocaleString("en-US")}
                </Badge>
              </CardTitle>
              <CardDescription>
                Products assigned to this category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryProducts products={category.products} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TagsIcon className="text-muted-foreground" aria-hidden />
                Translations
              </CardTitle>
              <CardDescription>
                Localized category names and descriptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {category.translations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No translations yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {category.translations.map((translation) => (
                    <div
                      key={translation.languageCode}
                      className="flex flex-col gap-2 rounded-lg border p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{translation.languageCode}</Badge>
                        <p className="font-medium">
                          {translation.name ?? category.name}
                        </p>
                      </div>
                      {translation.description ? (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {translation.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col">
                <InfoRow label="Parent">
                  {parent ? (
                    <Link
                      href={`/dashboard/categories/${parent.id}`}
                      className="hover:underline"
                    >
                      {parent.name}
                    </Link>
                  ) : (
                    "Root category"
                  )}
                </InfoRow>
                <InfoRow label="Children">
                  {category.children.length.toLocaleString("en-US")}
                </InfoRow>
                <InfoRow label="Products">
                  {category.products.length.toLocaleString("en-US")}
                </InfoRow>
                <InfoRow label="Updated">
                  {formatDateTime(category.updatedAt)}
                </InfoRow>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Meta title
                  </p>
                  <p className="text-sm">{orDash(category.metaTitle)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Meta description
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {orDash(category.metaDescription)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonMetadata value={category.metadata} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
