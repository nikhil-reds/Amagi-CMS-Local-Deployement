import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[linear-gradient(to_top,#0a0f34_0%,#000f93_22%,#6e6eff_52%,#e1e1ff_78%,#ffffff_100%)] px-6 py-8 lg:px-8 flex flex-col gap-8">
      <header className="flex flex-col gap-2 border-b border-sky-100 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Dashboard</h1>
        <p className="text-sm text-zinc-500">Overview of sessions, uploaded documents, and registered screens.</p>
      </header>

      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-32 rounded-2xl bg-white/50 backdrop-blur-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-40 rounded-2xl bg-white/50 backdrop-blur-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {Array.from({ length: 2 }).map((_, idx) => (
            <Skeleton key={idx} className="h-64 rounded-2xl bg-white/50 backdrop-blur-md" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl bg-white/50 backdrop-blur-md" />
      </div>
    </div>
  )
}
