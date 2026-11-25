import { Skeleton } from '@/components/ui/skeleton'

// Placeholders shaped like the real document rows and screen cards, so the
// layout does not jump when data arrives.

export function DocumentListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="main-screen-file-skeleton rounded-xl border border-gray-100 dark:border-zinc-800 p-4">
          <div className="flex gap-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-10 rounded" />
              </div>
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ScreenGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="main-screen-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="main-screen-loading-card overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
          </div>
          <div className="aspect-video flex flex-col items-center justify-center gap-3 rounded-xl">
            <Skeleton className="size-12 rounded-xl" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Shimmer laid over a screen card's preview until its image/video/website has loaded.
export function PreviewSkeleton() {
  return <Skeleton className="absolute inset-0 rounded-none bg-zinc-200 dark:bg-zinc-800" />
}
