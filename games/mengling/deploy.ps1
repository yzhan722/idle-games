# deploy.ps1 - load config from .env.local and deploy Pages
param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$version = "unknown"
$html = Get-Content "index.html" -Raw -ErrorAction SilentlyContinue
if ($html -match 'v(\d+\.\d+\.\d+)') { $version = "v$($Matches[1])" }

if (-not $Message) { $Message = "$version - deploy" }

Write-Host "=== Deploy $version ===" -ForegroundColor Green

if (-not (Test-Path ".env.local")) {
    Write-Host "[error] missing .env.local" -ForegroundColor Red
    exit 1
}

Get-Content ".env.local" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line -split "=", 2
        $key = $parts[0].Trim()
        $val = $parts[1].Trim().Trim('"')
        [Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
}

$token = $env:CLOUDFLARE_API_TOKEN
$account = $env:CLOUDFLARE_ACCOUNT_ID
$project = $env:CLOUDFLARE_PROJECT_NAME

if (-not $token) { Write-Host "[error] missing CLOUDFLARE_API_TOKEN" -ForegroundColor Red; exit 1 }
if (-not $account) { Write-Host "[error] missing CLOUDFLARE_ACCOUNT_ID" -ForegroundColor Red; exit 1 }
if (-not $project) { Write-Host "[error] missing CLOUDFLARE_PROJECT_NAME" -ForegroundColor Red; exit 1 }

$wrangler = "D:\npm-global\wrangler.cmd"
$useNpx = $false
if (-not (Test-Path $wrangler)) {
    $wrangler = (Get-Command wrangler -ErrorAction SilentlyContinue).Source
}
if (-not $wrangler) {
    $useNpx = $true
}

Write-Host "project: $project" -ForegroundColor Cyan
Write-Host "version: $version" -ForegroundColor Cyan
Write-Host "uploading..." -ForegroundColor Yellow
Write-Host ""

# only allow-listed files are uploaded (scripts/stage-release.mjs); never the project folder itself
$branch = (& git rev-parse --abbrev-ref HEAD)
$stage = Join-Path ([IO.Path]::GetTempPath()) ("mengling-release-" + [Guid]::NewGuid().ToString("N"))
& node "scripts/stage-release.mjs" $stage
if ($LASTEXITCODE -ne 0) { Write-Host "[error] staging failed" -ForegroundColor Red; exit 1 }

$env:CF_API_TOKEN = $token
$env:CLOUDFLARE_API_TOKEN = $token
Push-Location $stage
if ($useNpx) {
    & npx --yes wrangler pages deploy . --project-name=$project --branch=$branch --commit-message="$Message"
} else {
    & $wrangler pages deploy . --project-name=$project --branch=$branch --commit-message="$Message"
}
$deployCode = $LASTEXITCODE
Pop-Location
Remove-Item -Recurse -Force $stage

if ($deployCode -eq 0) {
    Write-Host ""
    Write-Host "=== Deploy OK ===" -ForegroundColor Green
    Write-Host "https://game.pokeauto.online/" -ForegroundColor Cyan
    Write-Host "Wait 1-2 min for CDN cache" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "=== Deploy failed (code: $deployCode) ===" -ForegroundColor Red
}
