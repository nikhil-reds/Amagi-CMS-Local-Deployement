import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { screenChannel } from '@/lib/realtime'
import { prisma } from '@/lib/prisma'
import { screenIdentifierWhere } from '@/lib/screen-code'

function createToken(screenId: string) {
  const secret = process.env.CENTRIFUGO_TOKEN_SECRET
  if (!secret) return null
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub: `screen-player:${screenId}`, channels: [screenChannel(screenId)], exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')
  const unsigned = `${header}.${payload}`
  return `${unsigned}.${crypto.createHmac('sha256', secret).update(unsigned).digest('base64url')}`
}
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const { screenId } = await params
  const screen = await prisma.screen.findUnique({ where: screenIdentifierWhere(screenId), select: { id: true } })
  if (!screen) return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
  const url = process.env.CENTRIFUGO_PUBLIC_URL
  const token = createToken(screen.id)
  if (!url || !token) return NextResponse.json({ url: null, token: null, channel: null })
  return NextResponse.json({ url, token, channel: screenChannel(screen.id) })
}
