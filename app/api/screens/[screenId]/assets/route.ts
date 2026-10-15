import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { publishScreenChanged } from '@/lib/realtime'
import { assetUrl } from '@/lib/asset-url'
import { screenIdentifierWhere } from '@/lib/screen-code'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  try {
    const { screenId } = await params
    const screen = await prisma.screen.findUnique({ where: screenIdentifierWhere(screenId), select: { id: true } })
    if (!screen) return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    const assets = await prisma.screenAsset.findMany({
      where: { screenId: screen.id },
      orderBy: { position: 'asc' },
      include: { document: true },
    })

    const result = await Promise.all(assets.map(async (asset) => ({
      ...asset,
      document: { ...asset.document, s3Url: await assetUrl(asset.document) },
    })))
    return NextResponse.json(result)
  } catch (error) {
    console.error('[screen assets GET]', error)
    return NextResponse.json({ error: 'Failed to fetch screen assets' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const denied = await requireRole('ADMIN', 'EDITOR')
  if (denied) return denied

  try {
    const { screenId } = await params
    const body = await request.json() as { documentId?: string }

    if (!body.documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const [screen, document] = await Promise.all([
      prisma.screen.findUnique({ where: screenIdentifierWhere(screenId) }),
      prisma.document.findUnique({ where: { id: body.documentId } }),
    ])

    if (!screen) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const asset = await prisma.screenAsset.upsert({
      where: {
        screenId: screen.id,
      },
      update: {
        documentId: body.documentId,
        position: 0,
        updatedAt: new Date(),
      },
      create: {
        screenId: screen.id,
        documentId: body.documentId,
        position: 0,
      },
      include: { document: true },
    })

    await publishScreenChanged(screenId)
    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('[screen assets POST]', error)
    return NextResponse.json({ error: 'Failed to assign asset to screen' }, { status: 500 })
  }
}
