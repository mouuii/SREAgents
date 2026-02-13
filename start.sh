#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 启动 SREAgents${NC}"
echo ""

# 清理函数 - 退出时杀掉所有子进程
cleanup() {
    echo ""
    echo -e "${YELLOW}⏹️  正在停止所有服务...${NC}"
    kill $MOCK_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $MOCK_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ 所有服务已停止${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 启动 Mock OTel 服务 (端口 9090)
echo -e "${BLUE}[1/3]${NC} 启动 Mock OTel 服务 (Prometheus + Jaeger)..."
cd "$SCRIPT_DIR/backend"
uv run python mock_otel.py &
MOCK_PID=$!

sleep 2

# 启动后端服务 (端口 8000)
echo -e "${BLUE}[2/3]${NC} 启动后端服务..."
uv run uvicorn server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

sleep 2

# 启动前端服务 (端口 5173)
echo -e "${BLUE}[3/3]${NC} 启动前端服务..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✅ 所有服务已启动${NC}"
echo ""
echo -e "   📊 Mock OTel:  ${YELLOW}http://localhost:9090${NC}"
echo -e "   🔧 Backend:    ${YELLOW}http://localhost:8000${NC}"
echo -e "   🌐 Frontend:   ${YELLOW}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"

# 等待所有进程
wait
