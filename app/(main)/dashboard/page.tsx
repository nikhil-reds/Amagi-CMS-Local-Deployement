'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, Copy, ExternalLink, FileText, ImageIcon, Clock, Monitor, Upload, Video } from 'lucide-react'
import { toast } from 'sonner'
import './dashboard.css'
import { formatBytes, formatDate } from '@/components/main-screen/shared'
import { Skeleton } from '@/components/ui/skeleton'

type DocumentItem = {
  id: string
  name: string
  mimeType: string
  size: number
  status: string
  createdAt: string
  cloudinaryUrl?: string
  s3Url?: string
}

type SessionItem = {
  id: string
  status: string
  createdAt: string
  _count?: { documents: number }
}

type ScreenItem = {
  id: string
  code: string
  name: string
  createdAt: string
  updatedAt: string
}

function StatusChip({ status }: { status: string }) {
  const tone = status === 'UPLOADED' || status === 'COMPLETED' ? 'on' : status === 'FAILED' ? 'fail' : status === 'PENDING' ? '' : 'pend'
  return (
    <span className={`chip ${tone}`}>
      <i aria-hidden="true" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

function DocIcon({ mimeType }: { mimeType: string }) {
  const Icon = mimeType.startsWith('video/') ? Video : mimeType.startsWith('image/') ? ImageIcon : FileText
  return <Icon className="size-4" />
}

// Segmented bar with a legend, as in the Multimedia Console reference.
function Meter({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  return (
    <>
      <div className="bar" role="img" aria-label={parts.map((part) => `${part.label} ${part.value}`).join(', ')}>
        {total === 0 ? (
          <span className="c-pend" style={{ flexGrow: 1 }} />
        ) : (
          parts
            .filter((part) => part.value > 0)
            .map((part) => <span key={part.label} className={part.className} style={{ flexGrow: part.value }} />)
        )}
      </div>
      <div className="legend">
        {parts.map((part) => (
          <div key={part.label}>
            <span><i className={part.className} aria-hidden="true" />{part.label}</span>
            <b>{part.value}</b>
          </div>
        ))}
      </div>
    </>
  )
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [screens, setScreens] = useState<ScreenItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch('/api/documents').then((res) => (res.ok ? res.json() : [])),
      fetch('/api/sessions').then((res) => (res.ok ? res.json() : [])),
      fetch('/api/screens').then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([docs, sessionData, screenData]) => {
        if (cancelled) return
        setDocuments(Array.isArray(docs) ? docs : [])
        setSessions(Array.isArray(sessionData) ? sessionData : [])
        setScreens(Array.isArray(screenData) ? screenData : [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const totalSize = documents.reduce((sum, doc) => sum + (doc.size || 0), 0)
    const completed = documents.filter((doc) => doc.status === 'UPLOADED' || doc.status === 'COMPLETED').length
    const failed = documents.filter((doc) => doc.status === 'FAILED').length
    const processing = documents.filter((doc) => doc.status === 'UPLOADING' || doc.status === 'PROCESSING' || doc.status === 'PENDING').length
    const recent = documents.filter((doc) => Date.now() - new Date(doc.createdAt).getTime() <= 24 * 60 * 60 * 1000).length
    const images = documents.filter((doc) => doc.mimeType.startsWith('image/')).length
    const videos = documents.filter((doc) => doc.mimeType.startsWith('video/')).length
    const pdfs = documents.filter((doc) => doc.mimeType === 'application/pdf').length
    const completedSessions = sessions.filter((session) => session.status === 'COMPLETED').length

    return { totalSize, completed, failed, processing, recent, images, videos, pdfs, completedSessions }
  }, [documents, sessions])

  const latestSessions = sessions.slice(0, 5)
  const latestDocuments = documents.slice(0, 5)

  return (
    <div className="dashboard-page" data-dashboard-ui>
      <header className="dashboard-head">
        <div>
          <h1>Dashboard</h1>
          <p>Sessions, documents and screens at a glance</p>
        </div>
        <Link href="/documents" className="dashboard-upload">
          <span>Upload files</span>
          <span className="dashboard-upload-dot" aria-hidden="true">
            <ArrowUp className="size-5" />
          </span>
        </Link>
      </header>

      {loading ? (
        <div className="dashboard-loading">
          <div className="dashboard-kpis">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-28 rounded-[18px] bg-white/5" />
            ))}
          </div>
          <Skeleton className="h-56 rounded-[20px] bg-white/5" />
          <div className="dashboard-two">
            <Skeleton className="h-64 rounded-[20px] bg-white/5" />
            <Skeleton className="h-64 rounded-[20px] bg-white/5" />
          </div>
        </div>
      ) : (
        <>
          <section aria-label="Workspace statistics" className="dashboard-kpis">
            <div className="glass dashboard-kpi">
              <span>Documents</span>
              <b>{documents.length}</b>
              <small>{stats.pdfs} PDF · {stats.videos} video</small>
            </div>
            <div className="glass dashboard-kpi">
              <span>Storage used</span>
              <b>{formatBytes(stats.totalSize)}</b>
              <small>across all files</small>
            </div>
            <div className="glass dashboard-kpi">
              <span>Sessions</span>
              <b>{sessions.length}</b>
              <small>{stats.completedSessions} completed</small>
            </div>
            <div className="glass dashboard-kpi">
              <span>Screens</span>
              <b>{screens.length}</b>
              <small>registered displays</small>
            </div>
            <div className="glass dashboard-kpi">
              <span>Added today</span>
              <b>{stats.recent}</b>
              <small>last 24 hours</small>
            </div>
          </section>

          <section className="dashboard-upload-row">
            <Link href="/documents" className="glass dashboard-drop">
              <span className="dashboard-drop-icon" aria-hidden="true">
                <Upload className="size-7" />
              </span>
              <b>Drop files here to upload</b>
              <span>PDFs, images and videos · or <u>browse</u></span>
            </Link>

            <article className="glass dashboard-card dashboard-library">
              <h2>Library</h2>
              <div className="dashboard-lrow">
                <span className="dashboard-lt">Processing</span>
                <Meter
                  parts={[
                    { label: 'Finalized', value: stats.completed, className: 'c-ready' },
                    { label: 'Processing', value: stats.processing, className: 'c-proc' },
                    { label: 'Failed', value: stats.failed, className: 'c-fail' },
                  ]}
                />
              </div>
              <div className="dashboard-lrow">
                <span className="dashboard-lt">Formats</span>
                <Meter
                  parts={[
                    { label: 'PDF', value: stats.pdfs, className: 'c-pdf' },
                    { label: 'Images', value: stats.images, className: 'c-img' },
                    { label: 'Video', value: stats.videos, className: 'c-vid' },
                  ]}
                />
              </div>
            </article>
          </section>

          <section className="dashboard-two">
            <article className="glass dashboard-card">
              <h2>
                Latest documents
                <Link href="/documents" className="dashboard-more">All documents</Link>
              </h2>
              <ul className="dashboard-items">
                {latestDocuments.length === 0 ? (
                  <li className="dashboard-empty">No documents yet.</li>
                ) : latestDocuments.map((doc) => (
                  <li key={doc.id}>
                    <span className="dashboard-ic"><DocIcon mimeType={doc.mimeType} /></span>
                    <span className="dashboard-t">
                      <b>{doc.name}</b>
                      <small>{doc.mimeType === 'application/pdf' ? 'PDF' : doc.mimeType.split('/')[0].toUpperCase()} · {formatBytes(doc.size)} · {formatDate(doc.createdAt)}</small>
                    </span>
                    <StatusChip status={doc.status} />
                  </li>
                ))}
              </ul>
            </article>

            <article className="glass dashboard-card">
              <h2>
                Sessions
                <span className="dashboard-count">{sessions.length}</span>
              </h2>
              <ul className="dashboard-items">
                {latestSessions.length === 0 ? (
                  <li className="dashboard-empty">No sessions yet.</li>
                ) : latestSessions.map((session) => (
                  <li key={session.id}>
                    <span className="dashboard-ic"><Clock className="size-4" /></span>
                    <span className="dashboard-t">
                      <b>{formatDate(session.createdAt)} · {session._count?.documents ?? 0} files</b>
                      <small>{session.id}</small>
                    </span>
                    <StatusChip status={session.status} />
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <h3 className="dashboard-sec">Screens</h3>
          <section aria-label="Screens" className="dashboard-screens">
            {screens.length === 0 ? (
              <p className="dashboard-empty">No screens registered.</p>
            ) : screens.map((screen) => (
              <article key={screen.id} className="glass dashboard-screen">
                <div className="dashboard-pv">
                  <Monitor className="size-6" aria-hidden="true" />
                </div>
                <div className="dashboard-screen-meta">
                  <div>
                    <b>{screen.name}</b>
                    <small>Created {formatDate(screen.createdAt)}</small>
                  </div>
                  <div className="dashboard-screen-actions">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(screen.code)
                        toast.success('Screen ID copied')
                      }}
                      title="Copy screen ID"
                      aria-label={`Copy ID for ${screen.name}`}
                    >
                      <Copy className="size-4" />
                    </button>
                    <Link href={`/view/screen/${screen.code}`} target="_blank" title="Open Screen" aria-label={`Open ${screen.name}`}>
                      <ExternalLink className="size-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
