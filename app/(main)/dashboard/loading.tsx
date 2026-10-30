import './dashboard.css'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="dashboard-page" data-dashboard-ui>
      <header className="dashboard-heading">
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
