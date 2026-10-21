"use client"

import NextImage from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "urql"
import {
  BoxesIcon,
  ImageIcon,
  LayersIcon,
  PackageIcon,
  ShieldCheckIcon,
  TagIcon,
  TruckIcon,
} from "lucide-react"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  ProductDetailDocument,
  type ProductDetailQuery,
  type ProductDetailQueryVariables,
} from "@workspace/graphql"

import {
  DetailPageHeader,
  InfoRow,
  JsonMetadata,
} from "@/components/dashboard/detail"
import { ErrorBanner } from "@/components/dashboard/error-banner"
import { backendMediaProxyUrl } from "@/lib/backend-media"
import { decodeRouteParam } from "@/lib/decode-param"
import { formatDateTime, orDash } from "@/lib/format"

type Product = ProductDetailQuery["product"]
type ProductVariant = Product["variants"]["edges"][number]["node"]
type ProductMedia = Product["medias"]["edges"][number]["node"]
type ProductAttribute = Product["attributes"][number]

function attributeDisplayValue(attribute: ProductAttribute) {
  const { value } = attribute

  if (value.dataType === "SWATCH" && value.value) {
    return (
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full border"
          style={{ backgroundColor: value.value }}
        />
        {orDash(value.label ?? value.value)}
      </span>
    )
  }

  if (value.boolean != null) return value.boolean ? "Yes" : "No"
  if (value.numeric != null) return value.numeric.toLocaleString("en-US")
  if (value.dateTime) return formatDateTime(value.dateTime)

  return orDash(
    value.label ?? value.plainText ?? value.value ?? undefined
  )
}

function VariantTable({ variants }: { variants: ProductVariant[] }) {
  if (variants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This product has no variants yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Variant</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Inventory</TableHead>
          <TableHead>Sort</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {variants.map((variant, index) => (
          <TableRow key={`${variant.sku ?? variant.name}-${index}`}>
            <TableCell className="font-medium">{variant.name}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {orDash(variant.sku)}
            </TableCell>
            <TableCell>
              <Badge variant={variant.trackInventory ? "secondary" : "outline"}>
                {variant.trackInventory ? "Tracked" : "Not tracked"}
              </Badge>
            </TableCell>
            <TableCell className="tabular-nums">
              {orDash(variant.sortOrder)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground tabular-nums">
              {formatDateTime(variant.updatedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MediaGrid({ media }: { media: ProductMedia[] }) {
  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center text-muted-foreground">
        <ImageIcon className="size-8 opacity-40" aria-hidden />
        <p className="text-sm">No media uploaded</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {media.map((item, index) => {
        const src = backendMediaProxyUrl(item.image?.url)
        return (
          <div key={`${item.image?.url ?? "media"}-${index}`} className="flex flex-col gap-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
              {src ? (
                <NextImage
                  src={src}
                  alt={item.caption || `Product media ${index + 1}`}
                  fill
                  sizes="(min-width: 1280px) 40vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <ImageIcon className="size-8 text-muted-foreground opacity-40" aria-hidden />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{item.caption || `Media ${index + 1}`}</span>
              <Badge variant={item.published ? "success" : "warning"}>
                {item.published ? "Published" : "Draft"}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-48" />
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

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const id = decodeRouteParam(params.id)

  const [{ data, fetching, error }, reexecute] = useQuery<
    ProductDetailQuery,
    ProductDetailQueryVariables
  >({
    query: ProductDetailDocument,
    variables: { id },
    pause: !id,
  })

  const product = data?.product

  if (fetching && !product) return <ProductDetailSkeleton />

  if (!product) {
    return (
      <div className="flex flex-col gap-6">
        <DetailPageHeader
          backHref="/dashboard/products"
          backLabel="Back to products"
          title="Product unavailable"
          subtitle={
            id
              ? "The product could not be loaded."
              : "The URL is missing a product id."
          }
        />
        <ErrorBanner
          error={error?.message ?? (!id ? "Missing product id" : "Product not found")}
          onRetry={() => reexecute({ requestPolicy: "network-only" })}
        />
      </div>
    )
  }

  const variants = product.variants.edges.map((edge) => edge.node)
  const media = product.medias.edges.map((edge) => edge.node)

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader
        backHref="/dashboard/products"
        backLabel="Back to products"
        title={product.title}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{product.slug}</span>
            <span aria-hidden>·</span>
            <span>{product.variants.totalCount.toLocaleString("en-US")} variants</span>
            <span aria-hidden>·</span>
            <span>{product.medias.totalCount.toLocaleString("en-US")} media</span>
          </div>
        }
        badges={
          <>
            <Badge variant={product.isPublic ? "success" : "warning"}>
              {product.isPublic ? "Public" : "Hidden"}
            </Badge>
            {product.productType ? (
              <Badge variant="secondary">{product.productType.title}</Badge>
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
              <CardDescription>The storefront-facing product copy.</CardDescription>
            </CardHeader>
            <CardContent>
              {product.description ? (
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {product.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayersIcon className="text-muted-foreground" aria-hidden />
                Variants
                <Badge variant="secondary">
                  {product.variants.totalCount.toLocaleString("en-US")}
                </Badge>
              </CardTitle>
              <CardDescription>
                The first 20 variants attached to this product.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VariantTable variants={variants} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="text-muted-foreground" aria-hidden />
                Media
                <Badge variant="secondary">
                  {product.medias.totalCount.toLocaleString("en-US")}
                </Badge>
              </CardTitle>
              <CardDescription>Images and captions for the storefront.</CardDescription>
            </CardHeader>
            <CardContent>
              <MediaGrid media={media} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TagIcon className="text-muted-foreground" aria-hidden />
                Attributes
              </CardTitle>
              <CardDescription>Values assigned to this product.</CardDescription>
            </CardHeader>
            <CardContent>
              {product.attributes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No product attributes.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attribute</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.attributes.map((attribute, index) => (
                      <TableRow key={`${attribute.attribute.slug}-${index}`}>
                        <TableCell className="font-medium">
                          {attribute.attribute.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {attribute.attribute.inputType}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {attributeDisplayValue(attribute)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Translations</CardTitle>
              <CardDescription>
                Localized titles and descriptions for this product.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {product.translations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No translations yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {product.translations.map((translation) => (
                    <div
                      key={translation.languageCode}
                      className="flex flex-col gap-2 rounded-lg border p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{translation.languageCode}</Badge>
                        <p className="font-medium">{translation.title}</p>
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
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="text-muted-foreground" aria-hidden />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col">
                <InfoRow label="Type">
                  {product.productType ? (
                    <span className="flex flex-col items-end">
                      <span>{product.productType.title}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {product.productType.slug}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </InfoRow>
                <InfoRow label="Categories">
                  {product.categories.length === 0 ? (
                    "—"
                  ) : (
                    <span className="flex flex-wrap justify-end gap-1">
                      {product.categories.map((category) => (
                        <Badge
                          key={category.id}
                          variant="secondary"
                          render={<Link href={`/dashboard/categories/${category.id}`} />}
                        >
                          {category.name}
                        </Badge>
                      ))}
                    </span>
                  )}
                </InfoRow>
                <InfoRow label="Shipping">
                  <span className="flex items-center justify-end gap-1.5">
                    <TruckIcon className="text-muted-foreground" aria-hidden />
                    {product.productType?.requireShipping
                      ? "Required"
                      : "Not required"}
                  </span>
                </InfoRow>
                <InfoRow label="Stock">
                  <span className="flex items-center justify-end gap-1.5">
                    <BoxesIcon className="text-muted-foreground" aria-hidden />
                    {product.productType?.trackStock ? "Tracked" : "Not tracked"}
                  </span>
                </InfoRow>
                <InfoRow label="Created">
                  {formatDateTime(product.createdAt)}
                </InfoRow>
                <InfoRow label="Updated">
                  {formatDateTime(product.updatedAt)}
                </InfoRow>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="text-muted-foreground" aria-hidden />
                SEO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Meta title
                  </p>
                  <p className="text-sm">{orDash(product.metaTitle)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Meta description
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {orDash(product.metaDescription)}
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
              <JsonMetadata value={product.metadata} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
