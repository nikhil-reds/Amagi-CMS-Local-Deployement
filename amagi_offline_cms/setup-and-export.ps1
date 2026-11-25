$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Install Docker Desktop first.' }
docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop, then run this script again.' }
if (!(Test-Path '.env')) {
  $minioSecret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $apiKey = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $tokenSecret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  @"
APP_PORT=8000
POSTGRES_PORT=5433
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
CENTRIFUGO_PORT=8001
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/multimedia
COOKIE_SECURE=false
MINIO_ENDPOINT=http://minio:8333
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_REGION=us-east-1
MINIO_BUCKET=multimedia-assets
MINIO_ACCESS_KEY=amagi-local
MINIO_SECRET_KEY=$minioSecret
CENTRIFUGO_HTTP_URL=http://centrifugo:8000
CENTRIFUGO_PUBLIC_URL=ws://localhost:8001/connection/websocket
CENTRIFUGO_API_KEY=$apiKey
CENTRIFUGO_TOKEN_SECRET=$tokenSecret
"@ | Set-Content -Encoding ascii '.env'
}
docker compose -f compose.yml pull db minio centrifugo
if ($LASTEXITCODE -ne 0) { throw 'Could not download service images. Check the network and try again.' }
docker compose -f compose.yml build app
if ($LASTEXITCODE -ne 0) { throw 'CMS image build failed.' }
$images = @('amagi-offline-cms-app:latest','chrislusf/seaweedfs:4.39','centrifugo/centrifugo:v6','postgres:16-alpine')
docker image save -o offline-images.tar $images
if ($LASTEXITCODE -ne 0) { throw 'Could not export Docker images.' }
docker compose -f compose.yml up -d --pull never
if ($LASTEXITCODE -ne 0) { throw 'Could not start the services.' }
Write-Host 'CMS running at http://localhost:8000. Create the first account; it becomes admin.'
Write-Host 'offline-images.tar is ready to transfer with this folder. Keep .env private.'
