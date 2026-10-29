import 'dotenv/config'
import { S3Client, GetBucketPolicyCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
const client = new S3Client({ endpoint: process.env.MINIO_ENDPOINT, region: process.env.MINIO_REGION || 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: process.env.MINIO_ACCESS_KEY!, secretAccessKey: process.env.MINIO_SECRET_KEY! } })
async function main() {
try { const p = await client.send(new GetBucketPolicyCommand({ Bucket: process.env.MINIO_BUCKET })); const policy = JSON.parse(p.Policy || '{}'); console.log('Anonymous read allowed:', policy.Statement?.some((s: { Effect?: string; Principal?: string; Action?: string[] }) => s.Effect === 'Allow' && s.Principal === '*' && s.Action?.includes('s3:GetObject'))) } catch(e) { console.log('Bucket policy lookup:', (e as Error).name) }
const list = await client.send(new ListObjectsV2Command({ Bucket: process.env.MINIO_BUCKET, Prefix: 'documents/', MaxKeys: 10 }))
const key = list.Contents?.find(x => x.Key?.endsWith('.pdf'))?.Key
if (key) { const url = `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`; const r = await fetch(url, { headers: { Range: 'bytes=0-31' } }); console.log('Anonymous PDF HTTP:', r.status) }

}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
