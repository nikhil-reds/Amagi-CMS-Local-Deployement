import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assetUrl } from '@/lib/asset-url'

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
  try {
    const { id } = await params
    const deleted = await prisma.document.delete({
      where: { id },
    })
    return NextResponse.json({ success: true, deleted })
  } catch (error) {
    console.error('[document DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
