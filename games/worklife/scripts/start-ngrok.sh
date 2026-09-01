#!/bin/bash
# WorkLife 游戏 - Ngrok 公网部署脚本 (Bash)
# 使用 ngrok 将本地服务暴露到公网

echo "========================================"
echo "  WorkLife 游戏 - Ngrok 公网部署"
echo "========================================"
echo ""

# 检查 ngrok 是否已安装
echo "检查 ngrok 是否已安装..."
if ! command -v ngrok &> /dev/null; then
    echo "✗ 未检测到 ngrok"
    echo ""
    echo "请先安装 ngrok:"
    echo "1. 访问 https://ngrok.com/download"
    echo "2. 下载对应系统版本"
    echo "3. 解压并移动到 /usr/local/bin"
    echo "   sudo mv ngrok /usr/local/bin/"
    echo ""
    echo "4. 注册 ngrok 账号: https://dashboard.ngrok.com/signup"
    echo "5. 获取 authtoken: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "6. 运行: ngrok config add-authtoken YOUR_TOKEN"
    echo ""
    exit 1
fi

echo "✓ ngrok 已安装"
echo ""

# 检查 ngrok 是否已配置 authtoken
echo "检查 ngrok 配置..."
if [ ! -f "$HOME/.ngrok2/ngrok.yml" ]; then
    echo "✗ ngrok 未配置 authtoken"
    echo ""
    echo "请先配置 ngrok authtoken:"
    echo "1. 访问 https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "2. 复制你的 authtoken"
    echo "3. 运行: ngrok config add-authtoken YOUR_TOKEN"
    echo ""
    exit 1
fi

echo "✓ ngrok 已配置"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 启动后端服务
echo "启动后端服务 (端口 3001)..."
cd "$SCRIPT_DIR/backend"
npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!
echo "✓ 后端服务启动中... (PID: $BACKEND_PID)"
sleep 3

# 启动前端服务
echo "启动前端服务 (端口 3000)..."
cd "$SCRIPT_DIR/frontend"
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
echo "✓ 前端服务启动中... (PID: $FRONTEND_PID)"
sleep 5

# 启动 ngrok 隧道
echo ""
echo "启动 ngrok 隧道..."
echo "正在为前端服务 (端口 3000) 创建公网访问链接..."
echo ""

# 使用 ngrok 暴露前端端口
ngrok http 3000

# 清理函数
cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "服务已停止"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

# 等待
wait
