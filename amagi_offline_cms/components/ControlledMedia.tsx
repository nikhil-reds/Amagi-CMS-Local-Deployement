'use client'
import { useEffect, useRef } from 'react'
import type { MediaControls, MediaKind } from '@/lib/media-controls'
export type ControlledAsset = { id: string; kind: MediaKind; controls: MediaControls; document: { id: string; name: string; mimeType: string; s3Url: string; websiteUrl?: string | null; sourceType?: string } }
type Status = { pages?: number; page?: number; duration?: number; currentTime?: number; error?: string }
type Runtime = { update(settings: MediaControls): void; destroy(): void }
declare global { interface Window { MediaRuntime?: { mount(host: HTMLElement, item: ControlledAsset, options: { kiosk: boolean; preview: boolean; onStatus?: (status: Status) => void }): Runtime } } }
let runtimePromise: Promise<void> | undefined
function loadRuntime() {
  return runtimePromise ??= new Promise<void>((resolve, reject) => {
    if (window.MediaRuntime) return resolve()
    const script = document.createElement('script'); script.src = '/media-runtime.js'; script.onload = () => resolve(); script.onerror = () => { runtimePromise = undefined; reject(new Error('Unable to load media renderer')) }; document.head.append(script)
  })
}
export default function ControlledMedia({ asset, kiosk = true, preview = false, onStatus }: { asset: ControlledAsset; kiosk?: boolean; preview?: boolean; onStatus?: (status: Status) => void }) {
  const host = useRef<HTMLDivElement>(null), runtime = useRef<Runtime | null>(null)
  const settings = useRef(asset.controls), status = useRef(onStatus)
  useEffect(() => { status.current = onStatus }, [onStatus])
  useEffect(() => { settings.current = asset.controls; runtime.current?.update(asset.controls) }, [asset.controls])
  useEffect(() => {
    let cancelled = false
    loadRuntime().then(() => {
      if (cancelled || !host.current) return
      runtime.current = window.MediaRuntime!.mount(host.current, { ...asset, controls: settings.current }, { kiosk, preview, onStatus: value => status.current?.(value) })
    }).catch(error => { if (host.current && !cancelled) host.current.textContent = error.message })
    return () => { cancelled = true; runtime.current?.destroy(); runtime.current = null }
    // Media is recreated only when its identity/source changes, not for control updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, asset.document.s3Url, asset.document.websiteUrl, kiosk, preview])
  return <div ref={host} className="h-full w-full" aria-label={asset.document.name} />
}
