'use client'

import { useEffect, useState } from 'react'
import { Maximize2, Monitor } from 'lucide-react'
import CloseButton from '../../[docId]/CloseButton'
import ControlledMedia, { type ControlledAsset } from '@/components/ControlledMedia'

type ScreenPlayerProps = { screenId: string; screenName: string; assets: ControlledAsset[]; kiosk?: boolean }

export default function ScreenPlayer({ screenId, screenName, assets: initialAssets, kiosk = false }: ScreenPlayerProps) {
  const [assets, setAssets] = useState(initialAssets)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function sync() {
      try {
        const response = await fetch(`/api/screens/${screenId}/controls`, { cache: 'no-store', signal: controller.signal })
        if (response.ok) { const data = await response.json(); if (!controller.signal.aborted) setAssets(data.assets) }
      } catch { /* Keep playing during temporary connection failures. */ }
      finally { if (!controller.signal.aborted) timer = setTimeout(sync, 1000) }
    }
    void sync()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [screenId])
  function enterFullscreen() {
    const target = document.documentElement
    if (!document.fullscreenElement) {
      target.requestFullscreen().catch(() => {})
    }
  }

  if (assets.length === 0) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-zinc-950 text-white select-none">
        <div className="max-w-md text-center p-8 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <Monitor className="size-8 text-zinc-500" />
          </div>
          <h2 className="text-lg font-bold text-white/90">{screenName}</h2>
          <p className="text-sm text-zinc-500">
            Drag an asset onto this screen from the main screen page to start playback.
          </p>
          {!kiosk && <CloseButton />}
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-dvh bg-black text-white">
      {!kiosk && (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <button
            onClick={enterFullscreen}
            className="flex size-10 items-center justify-center rounded-full bg-black/65 text-white/80 ring-1 ring-white/15 backdrop-blur transition hover:bg-black hover:text-white"
            aria-label={`Make ${screenName} full screen`}
            title="Full screen"
          >
            <Maximize2 className="size-5" />
          </button>
        </div>
      )}
      <div
        className="grid h-full w-full overflow-hidden"
        style={{ gridTemplateColumns: "minmax(0, 1fr)", gridTemplateRows: `repeat(${assets.length}, minmax(0, 1fr))` }}
      >
        {assets.map((asset) => (
          <section key={asset.id} aria-label={asset.document.name} className="h-full min-h-0 min-w-0 overflow-hidden">
            <ControlledMedia asset={asset} kiosk={kiosk} />
          </section>
        ))}
      </div>
    </div>
  )
}
