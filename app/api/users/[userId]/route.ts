import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser, hashPassword, requireRole, USER_ROLES, type UserRole } from '@/lib/auth'

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

async function hasAnotherAdmin(userId: string) {
  return (await prisma.user.count({ where: { role: 'ADMIN', id: { not: userId } } })) > 0
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const denied = await requireRole('ADMIN')
  if (denied) return denied

  try {
    const { userId } = await params
    const body = await request.json().catch(() => ({})) as { name?: unknown; role?: unknown; password?: unknown }
    const current = await prisma.user.findUnique({ where: { id: userId } })
    if (!current) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const data: { name?: string; role?: UserRole; passwordHash?: string } = {}
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      data.name = name
    }
    if (body.role !== undefined) {
      if (!isRole(body.role)) return NextResponse.json({ error: 'Select a valid role' }, { status: 400 })
      if (current.role === 'ADMIN' && body.role !== 'ADMIN' && !(await hasAnotherAdmin(userId))) {
        return NextResponse.json({ error: 'Keep at least one administrator in the workspace' }, { status: 400 })
      }
      data.role = body.role
    }
    if (body.password !== undefined) {
      if (typeof body.password !== 'string' || body.password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      data.passwordHash = await hashPassword(body.password)
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No changes supplied' }, { status: 400 })

    const user = await prisma.user.update({ where: { id: userId }, data, select: publicUser })
    return NextResponse.json({ user })
  } catch (error) {
    console.error('[users PATCH]', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const denied = await requireRole('ADMIN')
  if (denied) return denied

  try {
    const { userId } = await params
    const actor = await getCurrentUser()
    if (actor?.id === userId) return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.role === 'ADMIN' && !(await hasAnotherAdmin(userId))) {
      return NextResponse.json({ error: 'Keep at least one administrator in the workspace' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[users DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
