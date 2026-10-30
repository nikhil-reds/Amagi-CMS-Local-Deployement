import { prisma } from '@/lib/prisma'
import { screenIdentifierWhere } from '@/lib/screen-code'
import { controlsWithDefaults, mediaKind } from '@/lib/media-controls'
import { assetUrl } from '@/lib/asset-url'
import type { Prisma } from '@/app/generated/prisma/client'

// A strictly increasing database timestamp supplies revisions without a schema migration.
// Writers touch the screen inside the same transaction as the assignment/control change.
export async function touchScreen(tx: Prisma.TransactionClient, id: string) {
  await tx.$executeRaw`UPDATE "Screen" SET "updatedAt" = GREATEST(clock_timestamp(), "updatedAt" + interval '1 millisecond') WHERE "id" = ${id}`
}

export async function screenSnapshot(identifier: string) {
  return prisma.$transaction(async tx => {
    const screen = await tx.screen.findUnique({ where: screenIdentifierWhere(identifier), include: { assets: { orderBy: { position: 'asc' }, include: { document: true } } } })
    if (!screen) return null
    const assets = await Promise.all(screen.assets.map(async asset => ({
      id: asset.id, kind: mediaKind(asset.document), controls: controlsWithDefaults(asset.controls),
      document: { id: asset.document.id, name: asset.document.name, mimeType: asset.document.mimeType, sourceType: asset.document.sourceType, websiteUrl: asset.document.websiteUrl,
        // Relative PDF URLs are resolved against each player's CMS origin, never the publisher's localhost.
        s3Url: asset.document.mimeType === 'application/pdf' ? `/api/screens/${screen.code}/pdf/${asset.id}` : await assetUrl(asset.document) },
    })))
    return { id: screen.id, code: screen.code, name: screen.name, revision: screen.updatedAt.toISOString(), assets }
  }, { isolationLevel: 'RepeatableRead' })
}
