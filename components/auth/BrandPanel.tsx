import { FileText, Monitor, Radio } from "lucide-react"

import BrandLogo from "@/components/BrandLogo"

const highlights = [
  { icon: FileText, title: "Upload once", text: "Photos, videos, PDFs and website links in one library." },
  { icon: Monitor, title: "Assign to screens", text: "Drag any asset onto a display in seconds." },
  { icon: Radio, title: "Play everywhere", text: "Screens pick up new content automatically." },
]

// Decorative left side of the auth layout, in the TR navy (#012d74). Hidden on small screens.
export default function BrandPanel() {
  return (
    <div className="relative hidden p-4 lg:block">
      <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#000f93_0%,#0a0f34_45%,#1863dc_100%)] p-10 text-white shadow-2xl shadow-blue-950/30">
        {/* Soft sea-blue glows */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#6e6eff]/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-sky-400/20 blur-3xl" />
        {/* Subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <BrandLogo tone="light" className="relative" />

        <div className="relative max-w-md space-y-8">
          <ScreenMockup />
          <div className="space-y-3">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Every screen,
              <br />
              <span className="bg-gradient-to-r from-[#aaaaf5] to-white bg-clip-text text-transparent">one console.</span>
            </h2>
            <p className="text-sm leading-relaxed text-sky-100/70">
              Manage what plays on each of your displays from a single place.
            </p>
          </div>
          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                  <Icon className="size-4 text-[#aaaaf5]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-sky-100/60">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sky-100/50">© {new Date().getFullYear()} TR Fastenings. All rights reserved.</p>
      </div>
    </div>
  )
}

// A small illustration of the screens grid.
function ScreenMockup() {
  return (
    <div aria-hidden className="grid grid-cols-3 gap-2.5 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/15 backdrop-blur">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className={`aspect-video rounded-lg ${
            index === 1
              ? "bg-gradient-to-br from-[#6e6eff] to-[#1863dc] shadow-lg shadow-sky-500/30"
              : index === 3
                ? "bg-gradient-to-br from-white/40 to-white/15"
                : "bg-white/10"
          }`}
        />
      ))}
    </div>
  )
}
