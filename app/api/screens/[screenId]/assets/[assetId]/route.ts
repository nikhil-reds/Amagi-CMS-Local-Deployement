import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { publishScreenChanged } from '@/lib/realtime'
import { screenIdentifierWhere } from '@/lib/screen-code'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ screenId: string; assetId: string }> }
) {
  const denied = await requireRole('ADMIN', 'EDITOR')
  if (denied) return denied

  try {
    const { screenId, assetId } = await params
    const screen = await prisma.screen.findUnique({ where: screenIdentifierWhere(screenId), select: { id: true } })
    if (!screen) return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    await prisma.screenAsset.deleteMany({
      where: {
        id: assetId,
        screenId: screen.id,
      },
    })

    await publishScreenChanged(screen.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[screen assets DELETE]', error)
    return NextResponse.json({ error: 'Failed to remove screen asset' }, { status: 500 })
  }
}
