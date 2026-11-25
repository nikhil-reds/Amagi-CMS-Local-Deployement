import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  MIN_PASSWORD_LENGTH,
  createSession,
  getCurrentUser,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  toPublicUser,
} from '@/lib/auth'

// Anyone may create the very first account (it is signed in straight away).
// After that, only a signed-in user can add accounts.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { name?: unknown; email?: unknown; password?: unknown }
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
    }

    const isFirstUser = (await prisma.user.count()) === 0
    const currentUser = await getCurrentUser()
    if (!isFirstUser && currentUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can create accounts' }, { status: 403 })
    }

    if (await prisma.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password), role: isFirstUser ? 'ADMIN' : 'EDITOR' },
    })

    if (isFirstUser) await createSession(user.id, request, true)

    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 })
  } catch (error) {
    console.error('[auth register POST]', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
