export async function assetUrl(document: { id: string; websiteUrl: string | null; s3Key: string | null; s3Url: string | null; cloudinaryUrl: string | null }) {
  if (document.websiteUrl) return document.websiteUrl
  if (document.s3Key) return `/api/media/${encodeURIComponent(document.id)}`
  return document.cloudinaryUrl || document.s3Url || ''
}
