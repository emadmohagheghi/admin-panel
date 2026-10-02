// Map a backend media URL to the same-origin media proxy (app/api/media).
// Accepts absolute URLs (https://host:port/media/x.png) and relative ones
// (/media/x.png); returns null for anything that is not a /media/ path so
// callers fall back to a placeholder instead of a broken image.
export function backendMediaProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null
  let pathname: string
  try {
    // Relative URLs resolve against a throwaway base; absolute ones keep
    // their own origin, which the proxy strips away anyway.
    pathname = new URL(url, "http://placeholder.invalid").pathname
  } catch {
    return null
  }
  if (!pathname.startsWith("/media/")) return null
  return `/api/media${pathname.slice("/media".length)}`
}
