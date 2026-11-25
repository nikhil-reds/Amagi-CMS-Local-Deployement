$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path '.env')) { throw 'Missing private .env. Run setup-and-export.ps1 first or copy it from the source PC.' }
if (!(Test-Path 'offline-images.tar')) { throw 'Missing offline-images.tar. Run setup-and-export.ps1 on an internet-connected Docker PC first.' }
docker image load -i offline-images.tar
if ($LASTEXITCODE -ne 0) { throw 'Could not load offline-images.tar.' }
docker compose -f compose.yml up -d --pull never
if ($LASTEXITCODE -ne 0) { throw 'Could not start services.' }
Write-Host 'CMS running at http://localhost:8000'
