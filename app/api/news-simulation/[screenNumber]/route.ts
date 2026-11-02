import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ screenNumber: string }> },
) {
  const denied = await requireUser()
  if (denied) return denied

  const { screenNumber: value } = await params
  if (!/^(?:[1-9]|1[0-7])$/.test(value)) {
    return NextResponse.json({ error: 'Screen number must be between 1 and 17' }, { status: 400 })
  }

  try {
    const screen = await prisma.newsSimulationScreen.findUnique({
      where: { screenNumber: Number(value) },
    })

    if (!screen) {
      return NextResponse.json({ error: 'Simulation screen not found' }, { status: 404 })
    }

    return NextResponse.json(screen)
  } catch (error) {
    console.error('[news-simulation detail GET]', error)
    return NextResponse.json({ error: 'Failed to load simulation screen' }, { status: 500 })
  }
}
     