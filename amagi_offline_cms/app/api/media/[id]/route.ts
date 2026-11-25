import { prisma } from '@/lib/prisma'
import { readObject } from '@/lib/storage'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const document = await prisma.document.findUnique({
    where: { id },
    select: { s3Key: true, mimeType: true, status: true },
  })
  if (!document?.s3Key || document.status !== 'UPLOADED') return new Response(null, { status: 404 })

  try {
    const object = await readObject(document.s3Key, request.headers.get('range'))
    if (!object.Body) return new Response(null, { status: 502 })
    const headers = new Headers({
      'Content-Type': document.mimeType || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'X-Content-Type-Options': 'nosniff',
    })
    if (object.ContentLength !== undefined) headers.set('Content-Length', String(object.ContentLength))
    if (object.ContentRange) headers.set('Content-Range', object.ContentRange)
    return new Response(object.Body.transformToWebStream(), { status: object.ContentRange ? 206 : 200, headers })
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
    return new Response(null, { status: status === 404 || status === 416 ? status : 502 })
  }
}
