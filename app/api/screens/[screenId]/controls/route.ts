import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getCurrentUser } from '@/lib/auth'
import { validControlSession } from '@/lib/realtime-token'
import { screenSnapshot, touchScreen } from '@/lib/screen-snapshot'
import { publishScreenChanged } from '@/lib/realtime'
import { screenIdentifierWhere } from '@/lib/screen-code'
import { controlsWithDefaults, mediaKind, mediaPosition, validateControlPatch } from '@/lib/media-controls'
import { requestOrigin, reachableAssetUrl } from '@/lib/request-origin'

type Context = { params: Promise<{ screenId: string }> }
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { screenId } = await params
    const snapshot = await screenSnapshot(screenId)
    if (!snapshot) return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    const origin = requestOrigin(_request)
    return NextResponse.json({ ...snapshot, assets: snapshot.assets.map(asset => ({ ...asset, document: { ...asset.document, s3Url: reachableAssetUrl(asset.document.s3Url, origin) } })) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[controls GET]', error)
    return NextResponse.json({ error: 'Unable to load screen controls' }, { status: 500 })
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  const denied = await requireRole('ADMIN', 'EDITOR')
  if (denied) return denied
  let body: { assetId?: string; patch?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body.assetId !== 'string') return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 })
  const { screenId } = await params
  try {
    const screen = await prisma.screen.findUnique({ where: screenIdentifierWhere(screenId), select: { id: true } })
    if (!screen) return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    const user = await getCurrentUser()
    if (!user || !validControlSession(request.headers.get('x-control-session'), user.id, screen.id)) return NextResponse.json({ error: 'Connect to this screen before changing controls. Sessions expire after five minutes.' }, { status: 403 })
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await prisma.$transaction(async tx => {
          const asset = await tx.screenAsset.findFirst({ where: { id: body.assetId, screenId: screen.id }, include: { document: true } })
          if (!asset) return null
          const patch = validateControlPatch(mediaKind(asset.document), body.patch)
          const previous = controlsWithDefaults(asset.controls)
          const next = { ...previous, ...patch }
          if ('position' in patch || 'paused' in patch || 'rate' in patch || 'autoplay' in patch) {
            next.position = patch.position ?? mediaPosition(previous)
            next.positionAt = Date.now()
            // Explicit Play must also work for media with autoplay disabled.
            if (patch.paused === false) next.autoplay = true
          }
          await tx.screenAsset.update({ where: { id: asset.id }, data: { controls: next } })
          await touchScreen(tx, screen.id)
          return { assetId: asset.id, controls: next }
        }, { isolationLevel: 'Serializable' })
        if (!result) return NextResponse.json({ error: 'Item is not assigned to this screen' }, { status: 404 })
        const realtime = await publishScreenChanged(screen.id, 'controls.updated')
        return NextResponse.json({ ...result, realtime })
      } catch (error) {
        if ((error as { code?: string }).code === 'P2034' && attempt < 2) continue
        throw error
      }
    }
    return NextResponse.json({ error: 'Settings changed concurrently; please try again' }, { status: 409 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save controls'
    if (/Invalid |Setting |settings|address|Only HTTP|No settings|Enter a complete/.test(message)) return NextResponse.json({ error: message }, { status: 400 })
    console.error('[controls PATCH]', error)
    return NextResponse.json({ error: 'Unable to save controls' }, { status: 500 })
  }
}
