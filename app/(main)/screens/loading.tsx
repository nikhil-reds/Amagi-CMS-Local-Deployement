import './screens.css'
import { Skeleton } from '@/components/ui/skeleton'

export default function ScreensLoading() {
  return (
    <div className="screens-page" data-screens-ui>
      <header className="screens-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Screens</h1>
          <p className="text-xs text-zinc-500 mt-1">Manage your connected displays.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-60 rounded-xl bg-white/50 backdrop-blur-md" />
          <Skeleton className="h-10 w-32 rounded-xl bg-white/50 backdrop-blur-md" />
          <Skeleton className="h-10 w-28 rounded-xl bg-white/50 backdrop-blur-md" />
        </div>
      </header>

      <section className="screens-stats grid grid-cols-1 sm:grid-cols-2 gap-5 shrink-0">
        <Skeleton className="h-28 rounded-2xl bg-white/50 backdrop-blur-md shadow-lg" />
        <Skeleton className="h-28 rounded-2xl bg-white/50 backdrop-blur-md shadow-lg" />
      </section>

      <section className="screens-list flex-1 bg-white/85 backdrop-blur-md border border-white/70 shadow-blue-950/10 rounded-2xl shadow-lg overflow-hidden flex flex-col">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
             <Skeleton className="h-6 w-8 rounded-lg bg-zinc-200/50" />
             <Skeleton className="h-6 flex-1 rounded-lg bg-zinc-200/50" />
             <Skeleton className="h-6 w-32 rounded-lg bg-zinc-200/50" />
             <Skeleton className="h-6 w-32 rounded-lg bg-zinc-200/50" />
             <Skeleton className="h-6 w-24 rounded-lg bg-zinc-200/50" />
          </div>
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4 py-2">
              <Skeleton className="h-4 w-8 rounded bg-zinc-200/50" />
              <Skeleton className="h-8 w-8 rounded bg-zinc-200/50" />
              <Skeleton className="h-4 flex-1 rounded bg-zinc-200/50" />
              <Skeleton className="h-4 w-32 rounded bg-zinc-200/50" />
              <Skeleton className="h-4 w-32 rounded bg-zinc-200/50" />
              <Skeleton className="h-8 w-24 rounded bg-zinc-200/50" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
