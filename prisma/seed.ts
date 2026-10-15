import "dotenv/config"
import { randomBytes, scrypt } from "node:crypto"
import { promisify } from "node:util"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>

const email = process.env.SEED_USER_EMAIL ?? "admin@amagi.local"
const password = process.env.SEED_USER_PASSWORD ?? "Amagi!2026Console"

async function hashPassword(value: string) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(value, salt, 64)
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is required to seed the database")

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: "Amagi Admin",
        role: "ADMIN",
        passwordHash: await hashPassword(password),
      },
      create: {
        name: "Amagi Admin",
        email,
        role: "ADMIN",
        passwordHash: await hashPassword(password),
      },
    })

    console.log(`Seeded user: ${user.email}`)
    console.log(`Password: ${password}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
