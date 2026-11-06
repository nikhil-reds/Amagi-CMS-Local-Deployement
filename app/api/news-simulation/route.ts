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
  const address = typeof body?.address === 'string' ? body.address.trim() : ''
  const port = body?.port
  let host = ''
  try {
    const parsed = new URL(`http://${address}`)
    if (parsed.username || parsed.password || parsed.port || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error()
    host = parsed.hostname
  } catch {
    return NextResponse.json({ error: 'Enter a valid IP address or hostname without a protocol, port or path' }, { status: 400 })
  }
  if (!Number.isInteger(port) || port < 3000 || port > 3011) {
    return NextResponse.json({ error: 'Select a port between 3000 and 3011' }, { status: 400 })
  }

  try {
    const screens = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "NewsSimulationState" WHERE "id" = 'global' FOR UPDATE`
      const state = await tx.newsSimulationState.findUnique({ where: { id: 'global' } })
      if (state?.active) return null
      return Promise.all(Array.from({ length: 18 }, (_, index) => {
        const screenNumber = index + 1
        const name = `News Simulation Screen ${String(screenNumber).padStart(2, '0')}`
        const path = screenNumber <= 12 ? `screen${screenNumber}` : `broadcast${screenNumber - 12}`
        const data = { name, port, url: `http://${host}:${port}/${path}` }
        return tx.newsSimulationScreen.upsert({
          where: { screenNumber },
          create: { screenNumber, ...data },
          update: data,
        })
      }))
    })
    if (!screens) return NextResponse.json({ error: 'End the simulation before changing its port' }, { status: 409 })
    return NextResponse.json(screens)
  } catch (error) {
    console.error('[news-simulation PUT]', error)
    return NextResponse.json({ error: 'Failed to save simulation screens' }, { status: 500 })
  }
}
