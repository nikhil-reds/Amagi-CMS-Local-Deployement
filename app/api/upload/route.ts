import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assertStorageConfig, storageBucket, uploadBuffer } from '@/lib/storage'
import { requireRole } from '@/lib/auth'
import crypto from 'node:crypto'

export async function POST(request: NextRequest) {
  const denied = await requireRole('ADMIN', 'EDITOR')
  if (denied) return denied

  let files: File[]
  try {
    const form = await request.formData()
    files = form.getAll('files').filter((value): value is File => value instanceof File)
  } catch {
    return NextResponse.json({ error: 'Invalid multipart upload' }, { status: 400 })
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  try { assertStorageConfig() } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Storage is not configured' }, { status: 500 })
  }

  const session = await prisma.session.create({
    data: { status: 'UPLOADING' },
  })

  try {
    for (const file of files) {
      const documentId = crypto.randomUUID()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload'
      const key = `documents/${documentId}/${safeName}`
      await uploadBuffer(Buffer.from(await file.arrayBuffer()), key, file.type || 'application/octet-stream')
      await prisma.document.create({
        data: {
          id: documentId,
          sessionId: session.id,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          s3Bucket: storageBucket(),
          s3Key: key,
          s3Url: key,
          status: 'UPLOADED',
        },
      })
    }

    const result = await prisma.session.update({
      where: { id: session.id },
      data: { status: 'COMPLETED' },
      include: { documents: true },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    await prisma.session
      .update({ where: { id: session.id }, data: { status: 'FAILED' } })
      .catch(() => {})

    console.error('[upload finalize]', error)
    return NextResponse.json({ error: 'Failed to save documents' }, { status: 500 })
  }
}
