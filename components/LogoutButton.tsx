"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"

type CurrentUser = { name: string; email: string }

// Signed-in user + log out action, shown at the bottom of the sidebar.
export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
  }, [])

  async function handleLogout() {
    setSigningOut(true)
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (!response.ok) throw new Error()
      toast.success("Signed out")
      router.replace("/login")
      router.refresh()
    } catch {
      toast.error("Failed to sign out")
      setSigningOut(false)
    }
  }

  return (
    <div className="console-sidebar-account">
      {user && !compact ? (
        <div className="console-sidebar-profile">
          <div className="console-sidebar-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.name}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleLogout}
        disabled={signingOut}
        title="Log out"
        aria-label="Log out"
        className="console-sidebar-logout"
      >
        {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
        <span className="sr-only">{signingOut ? "Logging out…" : "Log out"}</span>
      </button>
    </div>
  )
}
