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

// Login normalizes email addresses to lowercase.
const email = (process.env.SEED_USER_EMAIL ?? "Triptishakya@gmail.com").trim().toLowerCase()
const password = process.env.SEED_USER_PASSWORD ?? "_6F5DIflvry9hCKXnQ6t!7a"
const name = "Tripti Shakya"

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
    const passwordHash = await hashPassword(password)
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        role: "ADMIN",
        passwordHash,
      },
      create: {
        name,
        email,
        role: "ADMIN",
        passwordHash,
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
