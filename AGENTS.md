# AGENTS.md

## 项目介绍

OpsAgent Platform 是一个智能运维助手平台，基于 Claude Agent SDK 构建。用户可以创建和管理运维智能体（Agent），为其配置技能（Skill），并通过对话方式执行运维任务。

## 项目结构

```
.
├── frontend/          # React + Vite 前端
│   ├── src/
│   │   ├── components/   # 组件
│   │   ├── context/      # React Context
│   │   └── pages/        # 页面
│   ├── package.json
│   └── vite.config.js
├── backend/           # Python FastAPI 后端
│   ├── .claude/
│   │   └── skills/       # SDK 原生 Skills (SKILL.md 格式)
│   ├── agents/           # 智能体定义 (Markdown)
│   ├── server.py         # 主服务 (端口 8000)
│   ├── mock_otel.py      # Mock OTel 服务 (端口 9090)
│   └── pyproject.toml
└── start.sh           # 一键启动脚本
```

## 组件说明

- **Frontend**: React 19 + Vite 7，提供 Agent 和 Skill 的管理界面及对话功能
- **Backend**: FastAPI，处理 Agent 对话请求，调用 Claude Agent SDK
- **Mock OTel**: 模拟 Prometheus + Jaeger 服务，提供监控和链路追踪数据

## 启动命令

一键启动所有服务：

```bash
./start.sh
```

分别启动：

```bash
# 前端 (端口 5173)
cd frontend && npm run dev

# 后端 (端口 8000)
cd backend && uv run uvicorn server:app --port 8000

# Mock OTel (端口 9090)
cd backend && uv run python mock_otel.py
```

## 开发命令

```bash
# 安装前端依赖
cd frontend && npm install

# 安装后端依赖
cd backend && uv sync

# 前端 lint
cd frontend && npm run lint

# 前端构建
cd frontend && npm run build
```

## 环境要求

- Node.js 18+
- Python 3.10+ (推荐 3.13)
- uv (Python 包管理器)

## 代码风格

- 前端：ESLint + React Hooks 规范
- 后端：Python 类型注解，Pydantic 数据模型
