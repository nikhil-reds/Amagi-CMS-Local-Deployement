"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

import "./sidebar.css"
import LogoutButton from "@/components/LogoutButton"
import { cn } from "@/lib/utils"

// Icons are the Multimedia Console reference set: 18px grid, 1.4 stroke, round caps.
function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <NavIcon>
        <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.2" />
        <rect x="10" y="2.5" width="5.5" height="5.5" rx="1.2" />
        <rect x="2.5" y="10" width="5.5" height="5.5" rx="1.2" />
        <rect x="10" y="10" width="5.5" height="5.5" rx="1.2" />
      </NavIcon>
    ),
    matcher: (pathname: string) => pathname.startsWith("/dashboard"),
  },
  {
    label: "Documents",
    href: "/documents",
    icon: (
      <NavIcon>
        <path d="M5 2.5h5.5L14 6v9.5H5z" />
        <path d="M10.5 2.5V6H14M7.5 10h4M7.5 12.5h4" />
      </NavIcon>
    ),
    matcher: (pathname: string) => pathname === "/" || pathname.startsWith("/documents"),
  },
  {
    label: "Main Screen",
    href: "/main-screen",
    icon: (
      <NavIcon>
        <rect x="2" y="3.5" width="14" height="9.5" rx="1.5" />
        <path d="M6.5 15.5h5" />
      </NavIcon>
    ),
    matcher: (pathname: string) => pathname.startsWith("/main-screen"),
  },
  {
    label: "Screens",
    href: "/screens",
    icon: (
      <NavIcon>
        <rect x="2" y="3" width="6" height="5" rx="1" />
        <rect x="10" y="3" width="6" height="5" rx="1" />
        <rect x="2" y="10" width="6" height="5" rx="1" />
        <rect x="10" y="10" width="6" height="5" rx="1" />
      </NavIcon>
    ),
    matcher: (pathname: string) => pathname.startsWith("/screens"),
  },
  {
    label: "News Simulation",
    href: "/news-simulation",
    icon: (
      <NavIcon>
        <rect x="2.5" y="3" width="13" height="12" rx="1.5" />
        <path d="M5.5 6.5h4M5.5 9h7M5.5 11.5h7" />
      </NavIcon>
    ),
    matcher: (pathname: string) => pathname.startsWith("/news-simulation"),
  },
  {
    label: "Control",
    href: "/control",
    icon: (
      <NavIcon>
        <path d="M3 5h12M3 13h12" />
        <circle cx="6.5" cy="5" r="1.6" />
        <circle cx="11.5" cy="13" r="1.6" />
      </NavIcon>
    ),
    matcher: (pathname: string) => pathname.startsWith("/control"),
  },
  {
    label: "Users",
    href: "/users",
    icon: (
      <NavIcon>
        <circle cx="7" cy="6.5" r="2.8" />
        <path d="M2 15c.5-2.8 2.6-4.3 5-4.3s4.5 1.5 5 4.3M12 4a2.6 2.6 0 0 1 0 5M13.5 10.9c1.4.6 2.3 1.9 2.5 4.1" />
      </NavIcon>
    ),
    matcher: (pathname: string) => pathname.startsWith("/users"),
  },
]

type AppSidebarProps = {
  onNavigate?: () => void
  // Icon-only rail used on tablets.
  compact?: boolean
}

export default function AppSidebar({ onNavigate, compact = false }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={cn("console-sidebar", compact && "console-sidebar-compact")}>
      <div className="console-sidebar-brand">
        <div className="console-sidebar-logo"><Image src="/amagi-logo-white.svg" alt="Amagi" width={125} height={35} unoptimized /></div>
        {!compact && (
          <>
            <p className="console-sidebar-title">Multimedia Console</p>
            <p className="console-sidebar-description">Streaming media management</p>
          </>
        )}
      </div>

      <nav className="console-sidebar-nav" aria-label="Main navigation">
        {navigationItems.map((item) => {
          const isActive = item.matcher(pathname)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={compact ? item.label : undefined}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn("console-sidebar-link", isActive && "console-sidebar-link-active")}
            >
              {item.icon}
              {!compact && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="console-sidebar-bottom">
        <a
          href="/XOS.exe?v=1.0.1"
          download="XOS.exe"
          title={compact ? "Download XOS (Windows)" : undefined}
          aria-label="Download XOS"
          className="console-sidebar-download"
        >
          <NavIcon>
            <path d="M9 2.5v9M5 8l4 4 4-4M3 15.5h12" />
          </NavIcon>
          {!compact && <span><b>Download XOS</b><small>Player app for your screens</small></span>}
        </a>
        <LogoutButton compact={compact} />
      </div>
    </aside>
  )
}
