'use client'
import { useEffect, useState } from 'react'
import type { ControlledAsset } from '@/components/ControlledMedia'
type Metadata = { pages?: number; duration?: number }
declare global { interface Window { MediaMetadataReader?: { read(asset: ControlledAsset, signal: AbortSignal): Promise<Metadata> } } }
let loader: Promise<void> | undefined
function loadReader() {
  return loader ??= new Promise<void>((resolve, reject) => {
    if (window.MediaMetadataReader) return resolve()
    const script = document.createElement('script')
    script.src = '/media-metadata.js'
    script.onload = () => resolve()
    script.onerror = () => { loader = undefined; reject(new Error('Unable to load media metadata')) }
    document.head.append(script)
  })
}
export function useMediaMetadata(asset: ControlledAsset) {
  const [metadata, setMetadata] = useState<Metadata>({})
  useEffect(() => {
    if (!['pdf', 'video', 'audio'].includes(asset.kind)) return
    const controller = new AbortController()
    loadReader().then(() => window.MediaMetadataReader!.read(asset, controller.signal)).then(result => { if (!controller.signal.aborted) setMetadata(result) }).catch(() => { /* Controls remain available if metadata cannot be read. */ })
    return () => controller.abort()
    // Settings update separately; metadata depends only on the assigned file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, asset.kind, asset.document.s3Url])
  return metadata
}
