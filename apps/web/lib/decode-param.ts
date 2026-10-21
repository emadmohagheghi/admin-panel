export function decodeRouteParam(value: string | string[] | undefined) {
  if (typeof value !== "string") return ""

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
