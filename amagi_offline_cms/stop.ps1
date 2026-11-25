$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
docker compose -f compose.yml stop
if ($LASTEXITCODE -ne 0) { throw 'Could not stop services.' }
Write-Host 'Services stopped; database and media volumes were kept.'
