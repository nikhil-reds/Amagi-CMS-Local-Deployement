import { publicObjectUrl } from '@/lib/storage'

export async function assetUrl(document: { websiteUrl: string | null; s3Key: string | null; s3Url: string | null; cloudinaryUrl: string | null }) {
  if (document.websiteUrl) return document.websiteUrl
  if (document.s3Key) return publicObjectUrl(document.s3Key)
  return document.cloudinaryUrl || document.s3Url || ''
}
