import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { publishScreenChanged } from '@/lib/realtime'
import { touchScreen } from '@/lib/screen-snapshot'
import { assetUrl } from '@/lib/asset-url'
import { screenIdentifierWhere } from '@/lib/screen-code'
import { MAX_ASSETS_PER_SCREEN } from '@/lib/screen-assets'

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

    const existing = await prisma.screenAsset.findUnique({
      where: { screenId_documentId: { screenId: screen.id, documentId: document.id } },
      include: { document: true },
    })
    if (existing) return NextResponse.json(existing)

    const asset = await prisma.$transaction(async (tx) => {
      const assetCount = await tx.screenAsset.count({ where: { screenId: screen.id } })
      if (assetCount >= MAX_ASSETS_PER_SCREEN) return null

      const lastAsset = await tx.screenAsset.findFirst({
        where: { screenId: screen.id },
        orderBy: { position: 'desc' },
        select: { position: true },
      })

      const assigned = await tx.screenAsset.create({
        data: {
          screenId: screen.id,
          documentId: document.id,
          controls: { positionAt: Date.now() },
          position: (lastAsset?.position ?? -1) + 1,
        },
        include: { document: true },
      })
      await touchScreen(tx, screen.id)
      return assigned
    })

    if (!asset) {
      return NextResponse.json({ error: `A screen can contain up to ${MAX_ASSETS_PER_SCREEN} items` }, { status: 400 })
    }

    const realtime = await publishScreenChanged(screen.id)
    return NextResponse.json({ ...asset, realtime }, { status: 201 })
  } catch (error) {
    console.error('[screen assets POST]', error)
    return NextResponse.json({ error: 'Failed to assign asset to screen' }, { status: 500 })
  }
}
