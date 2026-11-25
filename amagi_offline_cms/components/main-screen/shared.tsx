export type Session = {
  id: string
  status: string
  createdAt: string
  _count: { documents: number }
}

export function FileIcon({ mimeType, className = 'w-7 h-7' }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith('image/')) {
    return (
      <svg className={`${className} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm10-10a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    )
  }
  if (mimeType === 'application/pdf') {
    return (
      <svg className={`${className} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6M9 17h4" />
      </svg>
    )
  }
  if (mimeType.startsWith('video/')) {
    return (
      <svg className={`${className} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    )
  }
  if (mimeType.startsWith('audio/')) {
    return (
      <svg className={`${className} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
    )
  }
  return (
    <svg className={`${className} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

export function iconBg(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'bg-blue-50 dark:bg-blue-950/50'
  if (mimeType === 'application/pdf') return 'bg-red-50 dark:bg-red-950/50'
  if (mimeType.startsWith('video/')) return 'bg-purple-50 dark:bg-purple-950/50'
  if (mimeType.startsWith('audio/')) return 'bg-green-50 dark:bg-green-950/50'
  return 'bg-gray-100 dark:bg-zinc-800'
}

export type Document = {
  id: string
  name: string
  size: number
  mimeType: string
  s3Url: string
  status: string
}

export type SessionDetail = {
  id: string
  status: string
  createdAt: string
  documents: Document[]
}

export const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  UPLOADED: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  FAILED: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  UPLOADING: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400',
  PENDING: 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400',
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'}`}
    >
      {status}
    </span>
  )
}
