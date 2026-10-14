import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assetUrl } from '@/lib/asset-url'

// Links that point straight at an image or video are stored with that media type
// so screens render them as media instead of as a web page.
const MEDIA_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/mp4',
}

function mimeTypeForUrl(url: URL) {
  const extension = url.pathname.split('.').pop()?.toLowerCase() || ''
  return MEDIA_TYPES[extension] || 'text/uri-list'
}

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Cloudinary URLs are already permanent, no need for presigned URLs
    return NextResponse.json(await Promise.all(documents.map(async (document) => ({
      ...document,
      s3Url: await assetUrl(document),
    }))))
  } catch (error) {
    console.error('[documents GET]', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url?: string; name?: string }
    const rawUrl = body.url?.trim()

    if (!rawUrl) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(rawUrl)
    } catch {
      return NextResponse.json({ error: 'Enter a valid website URL' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Website URL must start with http:// or https://' }, { status: 400 })
    }

    const mimeType = mimeTypeForUrl(parsedUrl)
    const isMedia = mimeType !== 'text/uri-list'
    const fileName = decodeURIComponent(parsedUrl.pathname.split('/').pop() || '')

    const session = await prisma.session.create({
      data: { status: 'COMPLETED' },
    })

    const document = await prisma.document.create({
      data: {
        sessionId: session.id,
        name: body.name?.trim() || (isMedia ? fileName : '') || parsedUrl.hostname,
        size: 0,
        mimeType,
        sourceType: 'WEBSITE',
        websiteUrl: parsedUrl.toString(),
        status: 'UPLOADED',
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('[documents POST]', error)
    return NextResponse.json({ error: 'Failed to save website URL' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json() as { ids: string[] }
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'List of document IDs is required' }, { status: 400 })
    }

    const deleted = await prisma.document.deleteMany({
      where: { id: { in: ids } },
    })

    return NextResponse.json({ success: true, count: deleted.count })
  } catch (error) {
    console.error('[documents bulk DELETE]', error)
    return NextResponse.json({ error: 'Failed to perform bulk delete' }, { status: 500 })
  }
}
