"use client"

// صفحه‌ی ورود — فرم با react-hook-form + zod (resolver دستی lib/zod-resolver).
// طراحی دوستونه: سمت برند + سمت فرم؛ کاملاً RTL و ریسپانسیو.
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Eye, EyeOff, Loader2, LogIn, Store } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { login } from "@/lib/auth-session"
import { zodResolver } from "@/lib/zod-resolver"

const loginSchema = z.object({
  email: z.email("ایمیل معتبر وارد کنید"),
  password: z.string().min(1, "رمز عبور را وارد کنید"),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginValues) {
    setServerError(null)
    try {
      const result = await login(values.email, values.password)
      if (!result.ok) {
        // خطای ساختاریافته‌ی بک‌اند (ok:false) — مثلاً INVALID_CREDENTIALS
        setServerError(result.message || "ورود ناموفق بود")
        return
      }
      toast.success("خوش آمدید! ورود موفق بود.")
      // انتقال ساده؛ بعد از ساخت لی‌اوت داشبورد با router.replace جایگزین می‌شود
      window.location.assign("/dashboard")
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "خطای شبکه هنگام ورود")
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* سمت برند — فقط دسکتاپ */}
      <section className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="from-primary/8 via-primary/4 absolute inset-0 bg-gradient-to-bl to-transparent"
        />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
            <Store className="size-4.5" aria-hidden />
          </span>
          <span>زارینی | پنل مدیریت</span>
        </div>
        <div className="relative space-y-3">
          <h1 className="text-4xl leading-snug font-bold tracking-tight text-balance">
            فروشگاه‌ات را از یک‌جا
            <br />
            مدیریت کن.
          </h1>
          <p className="text-muted-foreground max-w-sm leading-7">
            محصولات، دسته‌بندی‌ها و کاربران — همه در یک داشبورد سریع و تایپ‌سیف.
          </p>
        </div>
        <p className="text-muted-foreground/70 relative text-xs">© ۱۴۰۵ فروشگاه زارینی</p>
      </section>

      {/* سمت فرم */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-right">
            <div className="bg-primary text-primary-foreground mx-auto flex size-11 items-center justify-center rounded-xl lg:hidden">
              <Store className="size-5" aria-hidden />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">ورود به پنل مدیریت</h2>
            <p className="text-muted-foreground text-sm">
              برای ادامه، ایمیل و رمز عبور حساب مدیریتی‌ات را وارد کن.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm leading-none font-medium">
                ایمیل
              </label>
              <input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                placeholder="admin@example.com"
                aria-invalid={!!errors.email}
                className={cn(
                  "border-input bg-background ring-offset-background placeholder:text-muted-foreground h-10 w-full rounded-lg border px-3 text-sm shadow-xs transition-colors outline-none",
                  "focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:ring-3",
                  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
                  errors.email && "border-destructive",
                )}
                {...register("email")}
              />
              {errors.email && (
                <p role="alert" className="text-destructive text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm leading-none font-medium">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  className={cn(
                    "border-input bg-background ring-offset-background placeholder:text-muted-foreground h-10 w-full rounded-lg border px-3 pe-10 text-sm shadow-xs transition-colors outline-none",
                    "focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:ring-3",
                    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
                    errors.password && "border-destructive",
                  )}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 end-0 flex w-10 items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-lg"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
              {errors.password && (
                <p role="alert" className="text-destructive text-xs">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <div
                role="alert"
                className="bg-destructive/10 text-destructive dark:bg-destructive/20 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
              >
                {serverError}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <LogIn aria-hidden data-icon="inline-start" />
              )}
              {isSubmitting ? "در حال ورود…" : "ورود"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
