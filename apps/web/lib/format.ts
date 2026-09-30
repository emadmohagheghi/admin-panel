// هلپرهای نمایش مقادیر در جدول‌ها
const dateTimeFormat = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
})

/** تاریخ و ساعت خوانا؛ برای null/خالی «—» */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—"
  try {
    return dateTimeFormat.format(new Date(value))
  } catch {
    return value
  }
}

/** متن یا «—» برای مقادیر اختیاری */
export function orDash(value?: string | number | null): string {
  return value == null || value === "" ? "—" : String(value)
}
