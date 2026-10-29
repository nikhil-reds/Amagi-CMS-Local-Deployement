import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ScreenPlayer from './ScreenPlayer'
import { assetUrl } from '@/lib/asset-url'
import { controlsWithDefaults, mediaKind } from '@/lib/media-controls'
import { screenIdentifierWhere } from '@/lib/screen-code'

export default async function ScreenViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ screenId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { screenId } = await params
  const kiosk = (await searchParams).kiosk === '1'
  const screen = await prisma.screen.findUnique({
    where: screenIdentifierWhere(screenId),
    include: {
      assets: {
        orderBy: { position: 'asc' },
        include: { document: true },
      },
    },
  })

  if (!screen) notFound()
  if (screenId !== screen.code) {
    const suffix = kiosk ? '?kiosk=1' : ''
    redirect(`/view/screen/${screen.code}${suffix}`)
  }

  const assets = await Promise.all(screen.assets.map(async (asset) => ({
    id: asset.id,
    kind: mediaKind(asset.document),
    controls: controlsWithDefaults(asset.controls),
    document: {
      id: asset.document.id,
      name: asset.document.name,
      mimeType: asset.document.mimeType,
      s3Url: await assetUrl(asset.document),
      websiteUrl: asset.document.websiteUrl,
      sourceType: asset.document.sourceType,
    },
  })))

  return <ScreenPlayer screenId={screen.code} screenName={screen.name} assets={assets} kiosk={kiosk} />
}
