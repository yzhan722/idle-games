# WorkLife 公网试玩 — ngrok 暴露生产栈
# 前置: docker compose up -d 已运行; ngrok 已装且配过 authtoken
# nginx 网关已配好 /api 反代与 /ws Upgrade——一条隧道 80 端口全搞定

$ErrorActionPreference = "Stop"

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
  Write-Host "未检测到 ngrok。装法: https://ngrok.com/download → ngrok config add-authtoken <token>" -ForegroundColor Red
  exit 1
}

Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "拉起生产栈..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Error "compose 启动失败"; exit 1 }

Write-Host "等待前端就绪..." -ForegroundColor Yellow
$deadline = (Get-Date).AddSeconds(60)
do {
  Start-Sleep -Seconds 2
  try { $ok = (Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $ok = $false }
} until ($ok -or (Get-Date) -gt $deadline)
if (-not $ok) { Write-Error "前端未在 60s 内就绪——先看 docker compose logs"; exit 1 }

Write-Host ""
Write-Host "开隧道: ngrok http 80" -ForegroundColor Cyan
Write-Host "分享打印出来的 https://xxxx.ngrok-free.app 给朋友即可" -ForegroundColor Green
Write-Host "(CORS: 同域 nginx 反代,无需改 .env; JWT/聊天全走隧道 TLS)" -ForegroundColor Green
Write-Host ""
ngrok http 80
