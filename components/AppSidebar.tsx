"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Download,
  FileText,
  LayoutDashboard,
  Grid2X2,
  SlidersHorizontal,
  Tv,
  Users,
} from "lucide-react"

import "./sidebar.css"
import LogoutButton from "@/components/LogoutButton"
import { cn } from "@/lib/utils"

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    matcher: (pathname: string) => pathname.startsWith("/dashboard"),
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    matcher: (pathname: string) => pathname === "/" || pathname.startsWith("/documents"),
  },
  {
    label: "Main Screen",
    href: "/main-screen",
    icon: Tv,
    matcher: (pathname: string) => pathname.startsWith("/main-screen"),
  },
  {
    label: "Screens",
    href: "/screens",
    icon: Grid2X2,
    matcher: (pathname: string) => pathname.startsWith("/screens"),
  },
  {
    label: "Control",
    href: "/control",
    icon: SlidersHorizontal,
    matcher: (pathname: string) => pathname.startsWith("/control"),
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
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
        {!compact && <p className="console-sidebar-title">Multimedia Console</p>}
      </div>

      <nav className="console-sidebar-nav" aria-label="Main navigation">
        {navigationItems.map((item) => {
          const isActive = item.matcher(pathname)
          const Icon = item.icon

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
              <Icon className="size-4" />
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
          <Download className="size-4" />
          {!compact && <span><b>Download XOS</b><small>Player app for your screens</small></span>}
        </a>
        <LogoutButton compact={compact} />
      </div>
    </aside>
  )
}
