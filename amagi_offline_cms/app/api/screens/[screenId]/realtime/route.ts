import { NextRequest, NextResponse } from 'next/server'
import { screenChannel, assertRealtimeConfig } from '@/lib/realtime'
import { prisma } from '@/lib/prisma'
import { screenIdentifierWhere } from '@/lib/screen-code'
import { getCurrentUser } from '@/lib/auth'
import { CONTROL_SESSION_MS, signRealtimeToken } from '@/lib/realtime-token'

type Context = { params: Promise<{ screenId: string }> }
async function issue(request: NextRequest, context: Context, controls: boolean) {
  try {
    assertRealtimeConfig()
    const user = controls ? await getCurrentUser() : null
    if (controls && !user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    if (controls && !['ADMIN', 'EDITOR'].includes(user!.role)) return NextResponse.json({ error: 'You cannot control screens' }, { status: 403 })
    const { screenId } = await context.params
    const screen = await prisma.screen.findUnique({ where: screenIdentifierWhere(screenId), select: { id: true } })
    if (!screen) return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    const expiresAt = controls ? Math.floor((Date.now() + CONTROL_SESSION_MS) / 1000) * 1000 : null
    const expiry = expiresAt ? { exp: expiresAt / 1000 } : {}
    const sub = controls ? `controller:${user!.id}` : `screen-player:${screen.id}`
    const channel = screenChannel(screen.id)
    // Player credentials are scoped to this read-only channel and are never cached on disk.
    return NextResponse.json({ url: process.env.CENTRIFUGO_PUBLIC_URL, channel,
      token: signRealtimeToken({ sub, ...expiry }),
      subscriptionToken: signRealtimeToken({ sub, channel, ...expiry }),
      expiresAt,
      sessionToken: controls ? signRealtimeToken({ purpose: 'controls', sub: user!.id, screenId: screen.id, ...expiry }) : null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Realtime unavailable' }, { status: 503 })
  }
}
export const GET = (request: NextRequest, context: Context) => issue(request, context, false)
export const POST = (request: NextRequest, context: Context) => issue(request, context, true)
