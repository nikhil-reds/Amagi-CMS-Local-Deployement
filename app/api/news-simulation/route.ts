import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, requireUser } from '@/lib/auth'

export async function GET() {
  const denied = await requireUser()
  if (denied) return denied

  try {
    return NextResponse.json(await prisma.newsSimulationScreen.findMany({ orderBy: { screenNumber: 'asc' } }))
  } catch (error) {
    console.error('[news-simulation GET]', error)
    return NextResponse.json({ error: 'Failed to load simulation screens' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const denied = await requireRole('ADMIN', 'EDITOR')
  if (denied) return denied

  const body = await request.json().catch(() => null)
  const port = body?.port
  if (!Number.isInteger(port) || port < 3000 || port > 3011) {
    return NextResponse.json({ error: 'Select a port between 3000 and 3011' }, { status: 400 })
  }

  try {
    const screens = await prisma.$transaction(
      Array.from({ length: 12 }, (_, index) => {
        const screenNumber = index + 1
        const data = { name: `Screen ${screenNumber}`, port, url: `http://localhost:${port}/view/screen/${screenNumber}` }
        return prisma.newsSimulationScreen.upsert({
          where: { screenNumber },
          create: { screenNumber, ...data },
          update: data,
        })
      }),
    )
    return NextResponse.json(screens)
  } catch (error) {
    console.error('[news-simulation PUT]', error)
    return NextResponse.json({ error: 'Failed to save simulation screens' }, { status: 500 })
  }
}
