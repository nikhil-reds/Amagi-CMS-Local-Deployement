"use client"

import { useEffect, useState } from "react"
import { Menu } from "lucide-react"

import AppSidebar from "@/components/AppSidebar"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import "./responsive.css"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 80rem) and (hover: hover) and (pointer: fine)")
    const closeOnDesktop = () => {
      if (desktop.matches) setIsSidebarOpen(false)
    }
    desktop.addEventListener("change", closeOnDesktop)
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [])

  return (
    // Console is always dark, so every page shares the reference black and aurora.
    <div className="dark h-dvh bg-black text-white md:flex overflow-hidden" suppressHydrationWarning>
      <div className="console-background" aria-hidden="true">
        <div className="console-aurora"><i /><i /><i /></div>
      </div>

      {/* Desktop sidebar */}
      <div className="console-sidebar-desktop fixed inset-y-0 left-0 z-30 w-[232px]">
        <AppSidebar />
      </div>

      <div className="relative z-10 flex h-dvh min-w-0 flex-1 flex-col console-workspace overflow-hidden">
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <Navbar
            menuControl={
              <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="console-menu-trigger"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
              </SheetTrigger>
            }
          />


          <SheetContent
            data-navigation-drawer=""
            side="left"
            className="w-72 max-w-[85vw] gap-0 bg-black p-0 text-white"
          >
            <SheetTitle className="sr-only">Main navigation</SheetTitle>
            <SheetDescription className="sr-only">Navigate between dashboard pages</SheetDescription>
            <AppSidebar onNavigate={() => setIsSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="console-content min-w-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  )
}
