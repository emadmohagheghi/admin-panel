"use client"

// Login page — single centered minimal form. One orchestrated entrance
// sequence (staggered fade-rise); reduced motion is respected via
// MotionConfig, and nothing loops or reacts to hover.
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, Store } from "lucide-react"
import { MotionConfig, motion, type Variants } from "motion/react"
import { z } from "zod"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

import { login } from "@/lib/auth-session"

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

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
        setServerError(result.message || "Sign in failed")
        return
      }
      window.location.assign("/dashboard")
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Network error while signing in")
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative flex min-h-svh items-center justify-center overflow-hidden p-6">
        {/* The single ornament: a static, barely-there glow behind the form */}
        <div
          aria-hidden
          className="bg-primary/5 absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        />

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="relative w-full max-w-xs"
        >
          <motion.div variants={item} className="flex flex-col items-center gap-3 text-center">
            <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
              <Store className="size-5" aria-hidden />
            </span>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
              <p className="text-muted-foreground text-sm">Use your admin account to continue.</p>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
            <motion.div variants={item} className="space-y-2">
              <label htmlFor="email" className="text-sm leading-none font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                className="h-10"
                {...register("email")}
              />
              {errors.email && (
                <p role="alert" className="text-destructive text-xs">
                  {errors.email.message}
                </p>
              )}
            </motion.div>

            <motion.div variants={item} className="space-y-2">
              <label htmlFor="password" className="text-sm leading-none font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  className="h-10 pe-10"
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
            </motion.div>

            {serverError && (
              <motion.p role="alert" variants={item} className="text-destructive text-sm">
                {serverError}
              </motion.p>
            )}

            <motion.div variants={item}>
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 aria-hidden data-icon="inline-start" className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>

        <footer className="text-muted-foreground/60 absolute bottom-6 text-xs">
          © 2026 Zariny Store
        </footer>
      </main>
    </MotionConfig>
  )
}
