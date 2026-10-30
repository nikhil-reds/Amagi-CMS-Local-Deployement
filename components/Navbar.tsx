"use client"

import "./navbar.css"

import { ThemeToggle } from "@/components/theme-toggle"

type NavbarProps = {
  menuControl?: React.ReactNode
}

export default function Navbar({ menuControl }: NavbarProps) {
  return (
    <header className="console-navbar sticky top-0 z-20 pt-safe">
      <div className="flex min-w-0 items-center gap-3">
        {menuControl}
        <div className="console-navbar-brand min-w-0">
          <p className="truncate text-sm font-bold text-zinc-950 dark:text-zinc-50">Amagi Multimedia</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="console-navbar-context hidden lg:block">
          Documents and screens
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
