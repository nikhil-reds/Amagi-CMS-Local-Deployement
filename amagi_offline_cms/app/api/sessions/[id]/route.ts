import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assetUrl } from '@/lib/asset-url'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Cloudinary URLs are already permanent, no need for presigned URLs
    return NextResponse.json({
      ...session,
      documents: await Promise.all(session.documents.map(async (document) => ({
        ...document,
        s3Url: await assetUrl(document),
      }))),
    })
  } catch (error) {
    console.error('[sessions detail GET]', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
