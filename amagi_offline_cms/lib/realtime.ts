import { screenSnapshot } from '@/lib/screen-snapshot'

export const screenChannel = (screenId: string) => `screen-${screenId}`
export type Delivery = { delivered: boolean; error?: string }
export function assertRealtimeConfig() {
  if (!process.env.CENTRIFUGO_HTTP_URL || !process.env.CENTRIFUGO_API_KEY || !process.env.CENTRIFUGO_PUBLIC_URL || !process.env.CENTRIFUGO_TOKEN_SECRET) throw new Error('Centrifugo is not configured. Live delivery is unavailable.')
}

export async function publishScreenChanged(screenId: string, type: 'media.updated' | 'controls.updated' | 'screen.deleted' = 'media.updated'): Promise<Delivery> {
  try {
    assertRealtimeConfig()
    const snapshot = type === 'screen.deleted' ? null : await screenSnapshot(screenId)
    const response = await fetch(`${process.env.CENTRIFUGO_HTTP_URL!.replace(/\/$/, '')}/api/publish`, {
      method: 'POST', headers: { 'X-API-Key': process.env.CENTRIFUGO_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: screenChannel(screenId), data: { type: snapshot ? type : 'screen.deleted', snapshot } }),
      signal: AbortSignal.timeout(5000),
    })
    const result = await response.json()
    if (!response.ok || result.error) throw new Error('Centrifugo rejected the update')
    return { delivered: true }
  } catch (error) {
    console.error('[realtime publish]', error)
    // The database write has already committed. Never claim delivery, retry, queue or poll.
    return { delivered: false, error: 'Saved, but live delivery failed. Reconnect the player to load the saved state.' }
  }
}
