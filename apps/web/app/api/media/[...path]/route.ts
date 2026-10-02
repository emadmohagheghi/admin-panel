// Same-origin proxy for backend media files (e.g. user avatars).
//
// The backend runs with a self-signed certificate, so the browser cannot load
// media from it directly (the request fails the certificate check before any
// image renders). Avatar/media URLs are therefore rewritten to this route,
// which fetches the file server-side through the shared backendFetch helper.
//
// Only paths under /media/ are proxied and traversal segments are rejected;
// everything else is 404 so this can't become an open proxy to the backend.
import { NextRequest, NextResponse } from "next/server"

import { BACKEND_ORIGIN, backendFetch } from "@/lib/backend"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!BACKEND_ORIGIN) {
    return new NextResponse("GRAPHQL_BACKEND_ENDPOINT is not configured", { status: 500 })
  }

  const { path: segments } = await params
  const targetPath = `/${segments.join("/")}`
  if (!targetPath.startsWith("/media/") || targetPath.includes("..")) {
    return new NextResponse("Not found", { status: 404 })
  }

  try {
    const backendRes = await backendFetch(`${BACKEND_ORIGIN}${targetPath}`, {
      headers: { Accept: "image/*" },
      cache: "no-store",
    })
    if (!backendRes.ok) return new NextResponse("Upstream error", { status: 502 })

    const body = await backendRes.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": backendRes.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return new NextResponse("Upstream unreachable", { status: 502 })
  }
}
