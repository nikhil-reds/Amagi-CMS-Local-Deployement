import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { documents: true } } },
  })
  return NextResponse.json(sessions)
}
