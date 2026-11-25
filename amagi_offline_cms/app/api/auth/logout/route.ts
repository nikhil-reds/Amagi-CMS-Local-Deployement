import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

export async function POST() {
  try {
    await destroySession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth logout POST]', error)
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}
