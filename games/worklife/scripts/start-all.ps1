# 一键启动所有服务（后端 + 前端 + 隧道）

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  WorkLife 完整启动脚本" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js 未安装" -ForegroundColor Red
    exit 1
}

# 检查 cloudflared
try {
    $cfVersion = cloudflared --version
    Write-Host "✓ cloudflared: $cfVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ cloudflared 未安装（可选）" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "正在启动服务..." -ForegroundColor Yellow
Write-Host ""

# 启动后端
Write-Host "[1/3] 启动后端服务..." -ForegroundColor Cyan
$projectRoot = Split-Path -Parent $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; Write-Host '后端服务 (http://localhost:3001)' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 3

# 启动前端
Write-Host "[2/3] 启动前端服务..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; Write-Host '前端服务 (http://localhost:3000)' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 5

# 启动隧道（如果安装了 cloudflared）
if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    Write-Host "[3/3] 启动 Cloudflare Tunnel..." -ForegroundColor Cyan
    
    # 前端隧道
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '前端隧道' -ForegroundColor Cyan; cloudflared tunnel --url http://localhost:3000"
    
    Start-Sleep -Seconds 2
    
    # 后端隧道
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '后端隧道' -ForegroundColor Cyan; cloudflared tunnel --url http://localhost:3001"
} else {
    Write-Host "[3/3] 跳过隧道（cloudflared 未安装）" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✓ 所有服务已启动！" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址：" -ForegroundColor Cyan
Write-Host "  本地前端: http://localhost:3000" -ForegroundColor White
Write-Host "  本地后端: http://localhost:3001" -ForegroundColor White
Write-Host "  公网地址: 查看隧道窗口" -ForegroundColor White
Write-Host ""
Write-Host "关闭窗口即可停止对应服务" -ForegroundColor Gray
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
