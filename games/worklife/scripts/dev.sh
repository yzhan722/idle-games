#!/bin/bash

# WorkLife 开发环境启动脚本

echo "🎮 启动 WorkLife 开发环境..."

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动后端和前端
echo "🚀 启动服务..."
npm run dev:backend & npm run dev:frontend

# 等待用户中断
wait
