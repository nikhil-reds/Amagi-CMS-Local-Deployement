import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { publishScreenChanged } from '@/lib/realtime'
import { screenIdentifierWhere } from '@/lib/screen-code'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  try {
    const { screenId } = await params
    const screen = await prisma.screen.findUnique({ where: screenIdentifierWhere(screenId) })

    if (!screen) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    }

    return NextResponse.json(screen)
  } catch (error) {
    console.error('[screens detail GET]', error)
    return NextResponse.json({ error: 'Failed to fetch screen' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const denied = await requireUser()
  if (denied) return denied

  try {
    const { screenId } = await params
    const body = await request.json()
    const { name } = body as { name?: string }

    const data: { name?: string } = {}
    if (name !== undefined) data.name = name

    const screen = await prisma.screen.findUnique({ where: screenIdentifierWhere(screenId), select: { id: true } })
    if (!screen) return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    const updated = await prisma.screen.update({
      where: { id: screen.id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[screens PATCH]', error)
    return NextResponse.json({ error: 'Failed to update screen' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const denied = await requireUser()
  if (denied) return denied

  try {
    const { screenId } = await params
    const screen = await prisma.screen.findUnique({ where: screenIdentifierWhere(screenId), select: { id: true } })
    if (!screen) return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    await prisma.screen.delete({
      where: { id: screen.id },
    })
    await publishScreenChanged(screen.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[screens DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete screen' }, { status: 500 })
  }
}
