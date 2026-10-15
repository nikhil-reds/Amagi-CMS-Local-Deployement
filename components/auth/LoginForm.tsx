"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Lock, Mail } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FormField from "./FormField"
import PasswordInput from "./PasswordInput"

type Errors = { email?: string; password?: string }

function validate(email: string, password: string): Errors {
  const errors: Errors = {}
  if (!email.trim()) errors.email = "Email is required"
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Enter a valid email address"
  if (!password) errors.password = "Password is required"
  else if (password.length < 6) errors.password = "Password must be at least 6 characters"
  return errors
}

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(email, password)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        toast.error(data?.error || "Failed to sign in")
        return
      }

      toast.success(`Welcome back, ${data.user.name}`)
      router.replace("/dashboard")
      router.refresh()
    } catch {
      toast.error("Could not reach the server")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormField id="email" label="Email" icon={Mail} error={errors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="pl-9"
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        icon={Lock}
        error={errors.password}
        labelAction={
          <Link href="#" className="text-xs font-semibold text-[#1863dc] transition hover:text-[#000f93]">
            Forgot password?
          </Link>
        }
      >
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          className="pl-9"
        />
      </FormField>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="size-4 rounded border-slate-300 accent-[#1863dc]"
        />
        Keep me signed in
      </label>

      <Button type="submit" disabled={submitting} className="h-12 w-full rounded-xl bg-[linear-gradient(135deg,#000f93_0%,#1863dc_100%)] text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 hover:shadow-blue-900/35">
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  )
}
