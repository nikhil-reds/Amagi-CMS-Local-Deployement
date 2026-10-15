import { Skeleton } from '@/components/ui/skeleton'

export default function ScreensLoading() {
  return (
    <div className="bg-[linear-gradient(to_top,#0a0f34_0%,#000f93_22%,#6e6eff_52%,#e1e1ff_78%,#ffffff_100%)] min-h-screen py-10 px-8 flex flex-col gap-8 antialiased">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100 pb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Screens</h1>
          <p className="text-xs text-zinc-500 mt-1">Register and monitor display endpoints.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-60 rounded-xl bg-white/50 backdrop-blur-md" />
          <Skeleton className="h-10 w-32 rounded-xl bg-white/50 backdrop-blur-md" />
          <Skeleton className="h-10 w-28 rounded-xl bg-white/50 backdrop-blur-md" />
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 shrink-0">
        <Skeleton className="h-28 rounded-2xl bg-white/50 backdrop-blur-md shadow-lg" />
        <Skeleton className="h-28 rounded-2xl bg-white/50 backdrop-blur-md shadow-lg" />
      </section>

      <section className="flex-1 bg-white/85 backdrop-blur-md border border-white/70 shadow-blue-950/10 rounded-2xl shadow-lg overflow-hidden flex flex-col">
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
