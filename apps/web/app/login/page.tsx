"use client"

// Login page — react-hook-form + zod (official resolver).
// Two-column brand/form layout, responsive and accessible.
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, LogIn, Store } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { login } from "@/lib/auth-session"

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
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
        // Structured backend error (ok:false) — e.g. INVALID_CREDENTIALS
        setServerError(result.message || "Sign in failed")
        return
      }
      toast.success("Welcome back! You are signed in.")
      window.location.assign("/dashboard")
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Network error while signing in")
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel — desktop only */}
      <section className="bg-sidebar relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="from-primary/8 via-primary/4 absolute inset-0 bg-gradient-to-br to-transparent"
        />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
            <Store className="size-4.5" aria-hidden />
          </span>
          <span>Zariny Store Admin</span>
        </div>
        <div className="relative space-y-3">
          <h1 className="text-4xl leading-snug font-bold tracking-tight text-balance">
            Run your whole store
            <br />
            from one place.
          </h1>
          <p className="text-muted-foreground max-w-sm leading-7">
            Products, categories and users — all in one fast, type-safe dashboard.
          </p>
        </div>
        <p className="text-muted-foreground/70 relative text-xs">© 2026 Zariny Store</p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <div className="bg-primary text-primary-foreground mx-auto flex size-11 items-center justify-center rounded-xl lg:hidden">
              <Store className="size-5" aria-hidden />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Sign in to the admin panel</h2>
            <p className="text-muted-foreground text-sm">
              Enter your admin account email and password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm leading-none font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
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
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
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
                className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
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
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
