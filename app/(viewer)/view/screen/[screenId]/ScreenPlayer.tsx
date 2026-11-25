'use client'

import { useEffect, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import CloseButton from '../../[docId]/CloseButton'
import ControlledMedia, { type ControlledAsset } from '@/components/ControlledMedia'
import { connectScreen } from '@/lib/screen-realtime'

type ScreenPlayerProps = { screenId: string; screenName: string; kiosk?: boolean }

export default function ScreenPlayer({ screenId, screenName, kiosk = false }: ScreenPlayerProps) {
  const [assets, setAssets] = useState<ControlledAsset[]>([])
  const [connectionError, setConnectionError] = useState('')
  const [connecting, setConnecting] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    return connectScreen(screenId, {
      onSnapshot: snapshot => setAssets(snapshot.assets),
      onConnected: () => { setConnecting(false); setConnectionError('') },
      onDisconnected: reason => { setConnecting(false); setConnectionError(reason); setAssets([]) },
      onDeleted: () => setAssets([]),
    })
  }, [screenId, attempt])
  function enterFullscreen() {
    const target = document.documentElement
    if (!document.fullscreenElement) {
      target.requestFullscreen().catch(() => {})
    }
  }

  if (assets.length === 0) {
    return (
      <div className="relative h-dvh bg-black text-white select-none">
        <img src="/Amagi%20Logo%20on%20Blue%20Gradient.png" alt="Amagi — no media assigned" className="h-full w-full object-contain" />
        {(connecting || connectionError) && <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-black/70 p-3 text-center text-sm" role="status">
          <p>{connecting ? 'Connecting to live screen updates…' : connectionError}</p>
          {connectionError && <button className="rounded-full bg-white px-5 py-2 text-sm text-black" onClick={() => { setConnecting(true); setConnectionError(''); setAttempt(value => value + 1) }}>Reconnect</button>}
        </div>}
        {!kiosk && <CloseButton />}
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
