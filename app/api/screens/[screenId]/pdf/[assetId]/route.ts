import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { screenIdentifierWhere } from '@/lib/screen-code'
import { assetUrl } from '@/lib/asset-url'
// A same-origin PDF stream avoids depending on storage-server CORS configuration.
export async function GET(request: NextRequest, { params }: { params: Promise<{ screenId: string; assetId: string }> }) {
  const { screenId, assetId } = await params
  try {
    const screen = await prisma.screen.findUnique({ where: screenIdentifierWhere(screenId), select: { id: true } })
    if (!screen) return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    const asset = await prisma.screenAsset.findFirst({ where: { id: assetId, screenId: screen.id }, include: { document: true } })
    if (!asset || asset.document.mimeType !== 'application/pdf') return NextResponse.json({ error: 'PDF not assigned to this screen' }, { status: 404 })
    const url = await assetUrl(asset.document)
    const range = request.headers.get('range')
    const upstream = await fetch(url, { headers: range ? { Range: range } : {}, signal: AbortSignal.timeout(30000) })
    if (!upstream.ok) return NextResponse.json({ error: 'PDF storage unavailable' }, { status: 502 })
    const headers = new Headers({ 'Content-Type': 'application/pdf', 'Cache-Control': 'private, max-age=60', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges' })
    for (const key of ['content-length', 'content-range', 'accept-ranges']) { const value = upstream.headers.get(key); if (value) headers.set(key, value) }
    return new NextResponse(upstream.body, { status: upstream.status, headers })
  } catch (error) { console.error('[PDF stream]', error); return NextResponse.json({ error: 'Unable to load PDF' }, { status: 502 }) }
}
