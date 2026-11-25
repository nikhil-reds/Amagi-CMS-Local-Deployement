import { randomInt } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export async function createScreenCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = String(randomInt(0, 100000)).padStart(5, '0')
    if (!(await prisma.screen.findUnique({ where: { code }, select: { id: true } }))) return code
  }
  throw new Error('Unable to allocate a unique screen code')
}

export function screenIdentifierWhere(identifier: string) {
  return identifier.length === 5 ? { code: identifier } : { id: identifier }
}
