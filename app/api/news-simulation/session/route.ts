import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, requireUser } from '@/lib/auth'
import { touchScreen } from '@/lib/screen-snapshot'
import { publishScreenChanged } from '@/lib/realtime'

export async function GET() {
  const denied = await requireUser()
  if (denied) return denied
  try {
    const [state, screens] = await Promise.all([
      prisma.newsSimulationState.findUnique({ where: { id: 'global' } }),
      prisma.screen.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, code: true, name: true } }),
    ])
    return NextResponse.json({ active: state?.active ?? false, targetScreenIds: state?.targetScreenIds ?? [], screens }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[simulation state]', error)
    return NextResponse.json({ error: 'Unable to load simulation state' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const denied = await requireRole('ADMIN', 'EDITOR')
  if (denied) return denied
  const body = await request.json().catch(() => null)
  if (!body || !['start', 'end'].includes(body.action)) return NextResponse.json({ error: 'Choose start or end' }, { status: 400 })
  try {
    const result = await prisma.$transaction(async tx => {
      // Serialize lifecycle operations so repeated/concurrent clicks cannot replace an active mapping.
      await tx.$queryRaw`SELECT "id" FROM "NewsSimulationState" WHERE "id" = 'global' FOR UPDATE`
      const state = await tx.newsSimulationState.findUniqueOrThrow({ where: { id: 'global' } })
      if ((body.action === 'start') === state.active) return { state, targets: state.targetScreenIds }
      let targets = state.targetScreenIds
      if (body.action === 'start') {
        const ids: unknown = body.targetScreenIds
        if (!Array.isArray(ids) || ids.length !== 4 || ids.some(id => typeof id !== 'string') || new Set(ids).size !== 4) throw new Error('Select four different destination screens')
        if (await tx.screen.count({ where: { id: { in: ids } } }) !== 4) throw new Error('A destination screen no longer exists')
        if (await tx.newsSimulationScreen.count({ where: { screenNumber: { gte: 1, lte: 12 } } }) !== 12) throw new Error('Save all simulation screens before starting')
        targets = ids as string[]
      }
      const next = await tx.newsSimulationState.update({ where: { id: 'global' }, data: { active: body.action === 'start', targetScreenIds: targets } })
      for (const id of targets) await touchScreen(tx, id)
      return { state: next, targets }
    })
    const destinations = await prisma.screen.findMany({ where: { id: { in: result.targets } }, select: { id: true } })
    const deliveries = await Promise.all(destinations.map(screen => publishScreenChanged(screen.id)))
    return NextResponse.json({ active: result.state.active, targetScreenIds: result.state.targetScreenIds, warning: deliveries.some(item => !item.delivered) ? 'Saved, but some players did not receive the live update. Reconnect those players.' : null })
  } catch (error) {
    console.error('[simulation lifecycle]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to change simulation' }, { status: 400 })
  }
}
