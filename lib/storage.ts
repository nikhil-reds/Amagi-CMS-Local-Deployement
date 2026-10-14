import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, PutBucketPolicyCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const bucket = process.env.MINIO_BUCKET || 'multimedia-assets'

const client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: process.env.MINIO_REGION || 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || '',
    secretAccessKey: process.env.MINIO_SECRET_KEY || '',
  },
})

export function storageBucket() { return bucket }

export function publicObjectUrl(key: string) {
  const endpoint = (process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT || '').replace(/\/$/, '')
  const encodedKey = key.split('/').map((part) => encodeURIComponent(part)).join('/')
  return `${endpoint}/${encodeURIComponent(bucket)}/${encodedKey}`
}

async function ensurePublicBucket() {
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
  } catch (error) {
    const code = (error as { name?: string }).name
    if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') throw error
  }

  await client.send(new PutBucketPolicyCommand({
    Bucket: bucket,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      }],
    }),
  }))
}

export async function uploadBuffer(buffer: Buffer, key: string, contentType: string) {
  await ensurePublicBucket()
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }))
  return { bucket, key }
}

export function downloadUrl(key: string) { return publicObjectUrl(key) }

export async function deleteObject(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

export function assertStorageConfig() {
  const missing = ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET']
    .filter((name) => !process.env[name])
  if (missing.length) throw new Error(`Missing MinIO environment variables: ${missing.join(', ')}`)
}
