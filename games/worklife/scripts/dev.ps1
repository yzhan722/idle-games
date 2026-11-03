# WorkLife 开发环境启动脚本 (Windows PowerShell)

Write-Host "🎮 启动 WorkLife 开发环境..." -ForegroundColor Green

# 检查是否安装了依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装依赖..." -ForegroundColor Yellow
    npm install
}

# 启动后端和前端
Write-Host "🚀 启动服务..." -ForegroundColor Green

# 在新窗口中启动后端
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev:backend"

# 等待1秒让后端先启动
Start-Sleep -Seconds 1

# 在新窗口中启动前端
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev:frontend"

Write-Host "✅ 服务已启动！" -ForegroundColor Green
Write-Host "后端: http://localhost:3001" -ForegroundColor Cyan
Write-Host "前端: http://localhost:5173" -ForegroundColor Cyan
