# WorkLife 游戏 - Ngrok 公网部署脚本 (PowerShell)
# 使用 ngrok 将本地服务暴露到公网

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WorkLife 游戏 - Ngrok 公网部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 ngrok 是否已安装
Write-Host "检查 ngrok 是否已安装..." -ForegroundColor Yellow
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokInstalled) {
    Write-Host "✗ 未检测到 ngrok" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装 ngrok:" -ForegroundColor Yellow
    Write-Host "1. 访问 https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. 下载 Windows 版本" -ForegroundColor White
    Write-Host "3. 解压到任意目录" -ForegroundColor White
    Write-Host "4. 将 ngrok.exe 所在目录添加到系统 PATH" -ForegroundColor White
    Write-Host "   或者将 ngrok.exe 复制到当前目录" -ForegroundColor White
    Write-Host ""
    Write-Host "5. 注册 ngrok 账号: https://dashboard.ngrok.com/signup" -ForegroundColor White
    Write-Host "6. 获取 authtoken: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
    Write-Host "7. 运行: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✓ ngrok 已安装" -ForegroundColor Green
Write-Host ""

# 检查 ngrok 是否已配置 authtoken
Write-Host "检查 ngrok 配置..." -ForegroundColor Yellow
$ngrokConfigPath = "$env:USERPROFILE\.ngrok2\ngrok.yml"
if (-not (Test-Path $ngrokConfigPath)) {
    Write-Host "✗ ngrok 未配置 authtoken" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先配置 ngrok authtoken:" -ForegroundColor Yellow
    Write-Host "1. 访问 https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
    Write-Host "2. 复制你的 authtoken" -ForegroundColor White
    Write-Host "3. 运行: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✓ ngrok 已配置" -ForegroundColor Green
Write-Host ""

# 启动后端服务
Write-Host "启动后端服务 (端口 3001)..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Normal
Write-Host "✓ 后端服务启动中..." -ForegroundColor Green
Start-Sleep -Seconds 3

# 启动前端服务
Write-Host "启动前端服务 (端口 3000)..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal
Write-Host "✓ 前端服务启动中..." -ForegroundColor Green
Start-Sleep -Seconds 5

# 启动 ngrok 隧道 - 前端
Write-Host ""
Write-Host "启动 ngrok 隧道..." -ForegroundColor Yellow
Write-Host "正在为前端服务 (端口 3000) 创建公网访问链接..." -ForegroundColor Cyan
Write-Host ""

# 使用 ngrok 暴露前端端口
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 3000 --log=stdout" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "服务状态:" -ForegroundColor Cyan
Write-Host "  • 后端服务: http://localhost:3001" -ForegroundColor White
Write-Host "  • 前端服务: http://localhost:3000" -ForegroundColor White
Write-Host "  • Ngrok 隧道: 查看 ngrok 窗口获取公网地址" -ForegroundColor White
Write-Host ""
Write-Host "注意事项:" -ForegroundColor Yellow
Write-Host "  1. 在 ngrok 窗口中找到 'Forwarding' 行" -ForegroundColor White
Write-Host "     例如: https://xxxx-xx-xx-xx-xx.ngrok-free.app" -ForegroundColor White
Write-Host "  2. 使用该地址访问游戏" -ForegroundColor White
Write-Host "  3. 免费版 ngrok 每次启动地址会变化" -ForegroundColor White
Write-Host "  4. 免费版有连接数限制 (40 connections/min)" -ForegroundColor White
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
