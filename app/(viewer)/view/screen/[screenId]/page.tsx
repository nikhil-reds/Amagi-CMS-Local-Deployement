import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ScreenPlayer from './ScreenPlayer'
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

  })

  if (!screen) notFound()
  if (screenId !== screen.code) {
    const suffix = kiosk ? '?kiosk=1' : ''
    redirect(`/view/screen/${screen.code}${suffix}`)
  }

  return <ScreenPlayer screenId={screen.code} screenName={screen.name} kiosk={kiosk} />
}
