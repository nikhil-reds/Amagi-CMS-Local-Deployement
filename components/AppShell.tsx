"use client"

import { useState } from "react"
import { Menu } from "lucide-react"

import AppSidebar from "@/components/AppSidebar"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import "./responsive.css"

// Navigation: overlay drawer on phones/tablets, icon rail on tablets, full sidebar on desktops.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    // Console is always dark, so every page shares the reference black and aurora.
    <div className="dark h-dvh bg-black text-white md:flex overflow-hidden" suppressHydrationWarning>
      <div className="console-background" aria-hidden="true">
        <div className="console-aurora"><i /><i /><i /></div>
      </div>

      {/* Tablet rail */}
      <div className="console-sidebar-rail hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:block md:w-[72px] lg:hidden">
        <AppSidebar compact />
      </div>

      {/* Desktop sidebar */}
      <div className="console-sidebar-desktop hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-[232px]">
        <AppSidebar />
      </div>

      <div className="relative z-10 flex h-dvh min-w-0 flex-1 flex-col md:pl-[72px] lg:pl-[232px] overflow-hidden">
        <Navbar
          menuControl={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation"
              aria-controls="navigation-drawer"
              aria-expanded={isSidebarOpen}
            >
              <Menu className="size-5" />
            </Button>
          }
        />

        {/* Phone and tablet overlay drawer */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent
            id="navigation-drawer"
            side="left"
            className="w-72 max-w-[85vw] gap-0 bg-black p-0 lg:hidden"
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
