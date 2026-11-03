# WorkLife 存档备份 — 每日跑一次（建议挂任务计划）
# 用法: powershell -File scripts/backup-db.ps1
# 备份文件写到 ./backups/（该目录已 gitignore）

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root "backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# 从 .env 读数据库名（不读密码——pg_dump 在容器内以 owner 身份跑，不需要密码）
$envFile = Join-Path $root ".env"
$dbName = "worklife"
$dbUser = "worklife"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^POSTGRES_DB=(.+)$') { $dbName = $Matches[1].Trim() }
    if ($_ -match '^POSTGRES_USER=(.+)$') { $dbUser = $Matches[1].Trim() }
  }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $backupDir "worklife-$stamp.dump"

Write-Host "备份 $dbName → $outFile"
docker exec worklife-db-1 pg_dump -U $dbUser -d $dbName -Fc > $outFile

if ($LASTEXITCODE -ne 0) { Write-Error "pg_dump 失败"; exit 1 }
$size = (Get-Item $outFile).Length
Write-Host ("完成: {0:N1} KB" -f ($size/1KB))

# 只保留最近 14 份
Get-ChildItem $backupDir -Filter "worklife-*.dump" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 14 |
  Remove-Item -Force
Write-Host "旧备份已清理(保留最近 14 份)"
