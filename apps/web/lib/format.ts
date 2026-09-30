// Display helpers for table values (en-US locale, project default)
const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
})

/** Readable date-time; "—" for null/empty */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—"
  try {
    return dateTimeFormat.format(new Date(value))
  } catch {
    return value
  }
}

/** Value or "—" for optional fields */
export function orDash(value?: string | number | null): string {
  return value == null || value === "" ? "—" : String(value)
}
