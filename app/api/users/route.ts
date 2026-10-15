import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { hashPassword, isValidEmail, normalizeEmail, requireRole, USER_ROLES, type UserRole } from '@/lib/auth'

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const

function isRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole)
}

export async function GET() {
  const denied = await requireRole('ADMIN')
  if (denied) return denied

  try {
    const users = await prisma.user.findMany({
      select: publicUser,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ users })
  } catch (error) {
    console.error('[users GET]', error)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireRole('ADMIN')
  if (denied) return denied

  try {
    const body = await request.json().catch(() => ({})) as { name?: unknown; email?: unknown; password?: unknown; role?: unknown }
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''
    const role = body.role === undefined ? 'EDITOR' : body.role

    if (!name || !email || !password) return NextResponse.json({ error: 'Name, email, and temporary password are required' }, { status: 400 })
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    if (!isRole(role)) return NextResponse.json({ error: 'Select a valid role' }, { status: 400 })

    const user = await prisma.user.create({
      data: { name, email, role, passwordHash: await hashPassword(password) },
      select: publicUser,
    })
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    console.error('[users POST]', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
