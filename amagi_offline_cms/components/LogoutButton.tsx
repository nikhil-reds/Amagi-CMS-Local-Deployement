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
  // Prevents hydration mismatch: user data is only available after first client fetch.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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
      {/* Only render user info after mount to avoid SSR/client mismatch */}
      {mounted && user && !compact ? (
        <div className="console-sidebar-profile">
          <div className="console-sidebar-avatar" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p>{user.name}</p>
            <p>{user.email}</p>
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
        {signingOut ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 15H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 3h3M12 12.5 15.5 9 12 5.5M15.5 9H7" />
          </svg>
        )}
        <span className="sr-only">{signingOut ? "Logging out…" : "Log out"}</span>
      </button>
    </div>
  )
}
