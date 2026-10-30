import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assetUrl } from '@/lib/asset-url'
import { requireRole } from '@/lib/auth'
import { touchScreen } from '@/lib/screen-snapshot'
import { publishScreenChanged } from '@/lib/realtime'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, name: true, mimeType: true, s3Key: true, s3Url: true, websiteUrl: true, cloudinaryUrl: true, status: true },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    id: doc.id,
    name: doc.name,
    mimeType: doc.mimeType,
    s3Url: await assetUrl(doc),
    status: doc.status,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole('ADMIN', 'EDITOR')
  if (denied) return denied
  try {
    const { id } = await params
    const { deleted, screenIds } = await prisma.$transaction(async tx => {
      const affected = await tx.screenAsset.findMany({ where: { documentId: id }, select: { screenId: true }, distinct: ['screenId'] })
      const screenIds = affected.map(item => item.screenId).sort()
      const deleted = await tx.document.delete({ where: { id } })
      for (const screenId of screenIds) await touchScreen(tx, screenId)
      return { deleted, screenIds }
    })
    const deliveries = await Promise.all(screenIds.map(id => publishScreenChanged(id)))
    return NextResponse.json({ success: true, deleted, realtime: { delivered: deliveries.every(item => item.delivered) } })
  } catch (error) {
    console.error('[document DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
