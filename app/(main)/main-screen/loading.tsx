import './main-screen.css'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentListSkeleton, ScreenGridSkeleton } from '@/components/main-screen/skeletons'

// Mirrors the layout of page.tsx (FilePanel + ScreenPanel) while the route loads.
export default function MainScreenLoading() {
  return (
    <div className="main-screen-page" data-main-screen-ui>
      <header className="main-screen-heading">
        <h1>Main Screen</h1>
        <p>Build what each screen plays. Add files from your library or drag them onto a screen.</p>
      </header>
      <div className="main-screen-workspace">
      <aside data-screen-library className="w-80 shrink-0 rounded-2xl bg-white/85 backdrop-blur-md border border-white/70 shadow-lg shadow-blue-950/10 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-8 rounded-full" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <DocumentListSkeleton />
        </div>
      </aside>

      <section data-screen-panel className="flex-1 rounded-2xl bg-white/85 backdrop-blur-md border border-white/70 shadow-lg shadow-blue-950/10 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 shrink-0 flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
        <div className="flex-1 overflow-hidden p-5">
          <ScreenGridSkeleton />
        </div>
      </section>
      </div>
    </div>
  )
}
