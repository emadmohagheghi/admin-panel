// اتصال zod به react-hook-form با یک resolver کوچک دست‌نویس.
// (برای جلوگیری از نصب پکیج اضافه‌ی @hookform/resolvers طبق قوانین پروژه)
import type { FieldErrors, FieldValues, Resolver } from "react-hook-form"
import type { ZodType } from "zod"

export function zodResolver<TValues extends FieldValues>(
  schema: ZodType<TValues>,
): Resolver<TValues> {
  return async (values) => {
    const result = schema.safeParse(values)
    if (result.success) {
      return { values: result.data, errors: {} }
    }
    const errors: FieldErrors<TValues> = {}
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "")
      if (key && !(key in errors)) {
        // تخصیص امن بدون any: شکل خطای RHF شامل type و message است
        Object.assign(errors, {
          [key]: { type: issue.code, message: issue.message },
        })
      }
    }
    return { values: {}, errors }
  }
}
