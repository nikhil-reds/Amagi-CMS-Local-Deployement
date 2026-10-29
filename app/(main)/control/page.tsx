'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, Expand, FileText, Globe, ImageIcon, Maximize2, Monitor, Pause, Play, RefreshCw, RotateCcw, Settings2, SkipBack, SkipForward, Volume2, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { type ControlledAsset } from '@/components/ControlledMedia'
import { useMediaMetadata } from '@/components/use-media-metadata'
import { mediaPosition, type MediaControls } from '@/lib/media-controls'

const surface = 'rounded-2xl border border-zinc-200 bg-white/90 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90'
const field = 'h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
type Screen = { id: string; code: string; name: string }
type ScreenData = Screen & { assets: ControlledAsset[] }
type Save = (asset: ControlledAsset, patch: Partial<MediaControls>) => void
const definitions = [
  { kind: 'pdf', title: 'PDF', description: 'Pages, zoom & document display', icon: FileText, tone: 'text-rose-500 bg-rose-500/10' },
  { kind: 'video', title: 'Video', description: 'Playback, sound & scaling', icon: Play, tone: 'text-violet-500 bg-violet-500/10' },
  { kind: 'website', title: 'Website', description: 'Address, refresh & page display', icon: Globe, tone: 'text-sky-500 bg-sky-500/10' },
  { kind: 'image', title: 'Image', description: 'Fit, rotation & presentation', icon: ImageIcon, tone: 'text-emerald-500 bg-emerald-500/10' },
] as const
function Tool({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} title={label} aria-label={label} className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">{children}</button>
}
function Setting({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}{children}</label>
}
function Choice({ label, value, options, onChange }: { label: string; value: string | number; options: [string | number, string][]; onChange: (value: string) => void }) {
  return <Setting label={label}><select value={value} onChange={e => onChange(e.target.value)} className={field}>{options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select></Setting>
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-indigo-500" />{label}</label>
}
function Range({ label, value, max, onCommit }: { label: string; value: number; max: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState<number | null>(null)
  return <Setting label={`${label}: ${Math.round(draft ?? value)}`}><input aria-label={label} type="range" min={0} max={max} value={draft ?? Math.min(value, max)} onChange={e => setDraft(Number(e.target.value))} onPointerUp={e => { onCommit(Number(e.currentTarget.value)); setDraft(null) }} onKeyUp={e => { if (e.key.startsWith('Arrow') || ['Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) { onCommit(Number(e.currentTarget.value)); setDraft(null) } }} className="w-full accent-indigo-500" /></Setting>
}
function time(value: number) { return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` }
function AssetControls({ asset, save }: { asset: ControlledAsset; save: Save }) {
  const c = asset.controls
  const patch = (value: Partial<MediaControls>) => save(asset, value)
  const { duration = 0, pages = 0 } = useMediaMetadata(asset)
  const [clock, setClock] = useState(() => Date.now())
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const position = mediaPosition(c, clock)
  const elapsed = duration ? (c.loop ? position % duration : Math.min(position, duration)) : position
  const scaling = <Choice label="Scaling" value={c.fit} options={[[ 'contain', 'Fit inside' ], ['cover', 'Fill screen'], ['none', 'Original size']]} onChange={v => patch({ fit: v as MediaControls['fit'] })} />
  return <>
    {asset.kind === 'pdf' && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Tool label="Previous page" onClick={() => patch({ page: Math.max(1, c.page - 1) })}><ArrowLeft className="size-4" /></Tool><Setting label={`Page${pages ? ` / ${pages}` : ''}`}><input aria-label="PDF page" key={c.page} type="number" min={1} max={pages || 100000} defaultValue={c.page} onBlur={e => { if (e.currentTarget.checkValidity()) patch({ page: Number(e.target.value) }) }} className={`${field} max-w-20`} /></Setting><Tool label="Next page" onClick={() => patch({ page: Math.min(pages || 100000, c.page + 1) })}><ArrowRight className="size-4" /></Tool></div><div className="flex items-center gap-2"><Tool label="Zoom out" onClick={() => patch({ zoom: Math.max(25, c.zoom - 25) })}><ZoomOut className="size-4" /></Tool><span className="text-xs text-zinc-500">{c.zoom}%</span><Tool label="Zoom in" onClick={() => patch({ zoom: Math.min(300, c.zoom + 25) })}><ZoomIn className="size-4" /></Tool><Tool label="Fit page" onClick={() => patch({ scale: 'page', zoom: 100 })}><Expand className="size-4" /></Tool></div></div>
      <div className="grid grid-cols-2 gap-4"><Choice label="Page scaling" value={c.scale} options={[[ 'width', 'Fit width' ], ['page', 'Fit page'], ['actual', 'Actual size']]} onChange={v => patch({ scale: v as MediaControls['scale'], zoom: 100 })} /><Choice label="Rotation" value={c.rotation} options={[[0, '0°'], [90, '90°'], [180, '180°'], [270, '270°']]} onChange={v => patch({ rotation: Number(v) })} /></div>
      <div className="flex flex-wrap gap-5"><Toggle label="Show toolbar" checked={c.toolbar} onChange={v => patch({ toolbar: v })} /><Toggle label="Show page thumbnails" checked={c.thumbnails} onChange={v => patch({ thumbnails: v })} /></div>
    </>}
    {asset.kind === 'video' && <>
      <Range label="Position (seconds)" value={elapsed} max={Math.max(duration, elapsed, 1)} onCommit={v => patch({ position: v })} /><p className="text-xs text-zinc-500">{time(elapsed)} / {duration ? time(duration) : 'Loading duration…'}</p>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><Tool label="Back 10 seconds" onClick={() => patch({ position: Math.max(0, elapsed - 10) })}><SkipBack className="size-4" /></Tool><Tool label="Play" onClick={() => patch({ paused: false, ...(duration > 0 && elapsed >= duration ? { position: 0 } : {}) })}><Play className="size-4" /></Tool><Tool label="Pause" onClick={() => patch({ paused: true })}><Pause className="size-4" /></Tool><Tool label="Forward 10 seconds" onClick={() => patch({ position: Math.min(duration || 604800, elapsed + 10) })}><SkipForward className="size-4" /></Tool></div><span className="flex items-center gap-2 text-xs text-zinc-500"><Volume2 className="size-4" />{c.paused || !c.autoplay ? 'Paused' : 'Playing'}</span></div>
      <Range label="Volume" value={c.volume} max={100} onCommit={v => patch({ volume: v })} /><div className="grid grid-cols-2 gap-4"><Choice label="Playback speed" value={c.rate} options={[[0.5, '0.5×'], [1, '1× Normal'], [1.5, '1.5×'], [2, '2×']]} onChange={v => patch({ rate: Number(v) })} />{scaling}</div><div className="flex gap-5"><Toggle label="Loop" checked={c.loop} onChange={v => patch({ loop: v })} /><Toggle label="Autoplay" checked={c.autoplay} onChange={v => patch({ autoplay: v })} /></div>
      <p className="text-xs text-zinc-500">Playback controls target the screen player. Position is estimated from the last command.</p>
    </>}
    {asset.kind === 'website' && <>
      <form onSubmit={e => { e.preventDefault(); patch({ url: url ?? (c.url || asset.document.websiteUrl || '') }); setUrl(null) }} className="space-y-2"><Setting label="Website address"><input type="url" required value={url ?? (c.url || asset.document.websiteUrl || '')} onChange={e => setUrl(e.target.value)} className={field} /></Setting><div className="flex gap-2"><button className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-black" type="submit">Update address</button><Tool label="Reload website" onClick={() => patch({ reload: Date.now() })}><RefreshCw className="size-4" /></Tool></div></form>
      <div className="grid grid-cols-2 gap-4"><Choice label="Page zoom" value={c.zoom} options={[[75, '75%'], [100, '100%'], [125, '125%'], [150, '150%']]} onChange={v => patch({ zoom: Number(v) })} /><Choice label="Auto refresh" value={c.refresh} options={[[0, 'Off'], [30, 'Every 30 seconds'], [60, 'Every minute'], [300, 'Every 5 minutes']]} onChange={v => patch({ refresh: Number(v) })} /></div><p className="text-xs text-zinc-500">Some websites block embedded display. Use an address that allows iframes.</p>
    </>}
    {asset.kind === 'image' && <><div className="flex justify-end gap-2"><Tool label="Rotate image" onClick={() => patch({ rotation: (c.rotation + 90) % 360 })}><RotateCcw className="size-4" /></Tool><Tool label="Fit image" onClick={() => patch({ fit: 'contain', rotation: 0 })}><Maximize2 className="size-4" /></Tool></div><div className="grid grid-cols-2 gap-4">{scaling}<Choice label="Background" value={c.background} options={[[ 'black', 'Black' ], ['white', 'White'], ['transparent', 'Transparent']]} onChange={v => patch({ background: v as MediaControls['background'] })} /></div></>}
  </>
}
export default function ControlPage() {
  const [screens, setScreens] = useState<Screen[]>([]), [screenId, setScreenId] = useState('')
  const [data, setData] = useState<ScreenData | null>(null), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false)
  const [error, setError] = useState(''), [canEdit, setCanEdit] = useState(false), [ready, setReady] = useState(false)
  const mutation = useRef(0), savingRef = useRef(false)
  const activeScreen = useRef(screenId)
  useEffect(() => { activeScreen.current = screenId }, [screenId])
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([fetch('/api/screens', { signal: controller.signal, cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error('Unable to load screens'); return r.json() }), fetch('/api/auth/me', { signal: controller.signal }).then(r => r.json())]).then(([list, auth]) => { setScreens(list); setCanEdit(['ADMIN', 'EDITOR'].includes(auth.user?.role)); if (list.length) { setLoading(true); setScreenId(list[0].code) } }).catch(e => { if (!controller.signal.aborted) setError(e.message) }).finally(() => { if (!controller.signal.aborted) setReady(true) })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!screenId) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function load() {
      const version = mutation.current
      try { const r = await fetch(`/api/screens/${screenId}/controls`, { cache: 'no-store', signal: controller.signal }); const result = await r.json(); if (!r.ok) throw new Error(result.error); if (!controller.signal.aborted && version === mutation.current && !savingRef.current) { setData(result); setError('') } }
      catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load controls') }
      finally { if (!controller.signal.aborted) { setLoading(false); timer = setTimeout(load, 3000) } }
    }
    void load()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [screenId])
  const save: Save = useCallback(async (asset, patch) => {
    const target = screenId
    if (savingRef.current) return
    savingRef.current = true; mutation.current++; setSaving(true)
    try {
      const response = await fetch(`/api/screens/${target}/controls`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: asset.id, patch }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to save settings')
      if (activeScreen.current === target) setData(current => current ? { ...current, assets: current.assets.map(item => item.id === asset.id ? { ...item, controls: result.controls } : item) } : current)
      toast.success('Screen settings updated')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to save settings') }
    finally { savingRef.current = false; setSaving(false) }
  }, [screenId])
  return <div className="min-h-dvh bg-[linear-gradient(to_top,#0a0f34_0%,#000f93_22%,#6e6eff_52%,#e1e1ff_78%,#ffffff_100%)] px-3 py-5 dark:bg-[linear-gradient(to_top,#050f64_0%,#0a0f34_50%,#323243_100%)] sm:px-5 sm:py-8 lg:px-8 lg:py-10"><div className="container-page space-y-6">
    <header className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-center"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400"><Settings2 className="size-3.5" />MEDIA WORKSPACE</div><h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Control</h1><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Control each assigned item on your display.</p></div><span role="status" className="w-fit rounded-full bg-indigo-500/10 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-300">{saving ? 'Saving…' : !ready || loading ? 'Loading…' : 'Settings sync automatically'}</span></header>
    <section className={`${surface} flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center`}><div className="flex items-center gap-3"><Monitor className="size-6 text-zinc-500" /><div><h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Screen controls</h2><p className="mt-1 text-xs text-zinc-500">Changes reach open players in about a second.</p></div></div><div className="flex flex-wrap items-end gap-3"><Setting label="Target screen"><select className={`${field} sm:w-48`} value={screenId} onChange={e => { setLoading(Boolean(e.target.value)); setData(null); setError(''); setScreenId(e.target.value) }} disabled={saving}><option value="">Select a screen</option>{screens.map(s => <option key={s.id} value={s.code}>{s.name} · {s.code}</option>)}</select></Setting><span className="flex h-10 items-center gap-2 text-xs text-zinc-500"><ArrowDown className="size-4" />Top to bottom</span>{screenId && <a className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300" href={`/view/screen/${screenId}`} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Open player</a>}</div></section>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-950">{error}</p>}
    {ready && !canEdit && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Only administrators and editors can change media settings.</p>}
    {ready && !screens.length && !error && <p className={`${surface} p-6 text-sm text-zinc-500`}>No screens available. Add a screen and assign media first.</p>}
    {(!ready || loading) && <p role="status" className={`${surface} p-6 text-sm text-zinc-500`}>Loading assigned media…</p>}
    {ready && !loading && screenId && data && data.assets.length === 0 && <div className={`${surface} flex flex-col items-center gap-3 p-10 text-center`}><Monitor className="size-8 text-zinc-400" /><h2 className="text-base font-semibold text-zinc-900 dark:text-white">No content assigned</h2><p className="text-sm text-zinc-500">Assign content from Main Screen to see its controls here.</p></div>}
    {ready && !screenId && screens.length > 0 && <p className={`${surface} p-6 text-sm text-zinc-500`}>Select a screen to see controls for its assigned content.</p>}
    <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{data?.assets.map((asset, index) => {
      const definition = definitions.find(item => item.kind === asset.kind)
      const { title, description, icon: Icon, tone } = definition || { title: 'File', description: 'Assigned content', icon: FileText, tone: 'text-zinc-500 bg-zinc-500/10' }
      return <section key={asset.id} aria-label={`${title} controls: ${asset.document.name}`} className={`${surface} min-w-0`}>
        <header className="flex items-start gap-3 border-b border-zinc-200 p-5 dark:border-zinc-800">
          <span className={`shrink-0 rounded-xl p-3 ${tone}`}><Icon className="size-5" /></span>
          <div className="min-w-0 flex-1"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Item {index + 1} · {title}</p><h2 className="break-words text-base font-semibold text-zinc-900 dark:text-white">{asset.document.name}</h2><p className="mt-1 text-xs text-zinc-500">{description}</p></div>
        </header>
        <div className="p-5">{definition ? <fieldset disabled={saving || !canEdit} className="min-w-0 space-y-5 disabled:opacity-60"><legend className="sr-only">Controls for {asset.document.name}</legend><AssetControls asset={asset} save={save} /></fieldset> : <p className="text-sm text-zinc-500">Controls are available for PDF, video, website, and image assets.</p>}</div>
      </section>
    })}</div>
  </div></div>
}
