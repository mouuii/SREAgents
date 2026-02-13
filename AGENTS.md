# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

SREAgents — 智能运维助手平台，基于 Claude Agent SDK 构建。用户可创建和管理运维智能体（Agent），为其配置技能（Prometheus 监控、Jaeger 链路追踪等），通过自然语言对话执行运维任务。

## 常用命令

### 一键启动（三个服务同时启动）
```bash
./start.sh
```

### 分别启动
```bash
# 前端 (端口 5173)
cd frontend && npm run dev

# 后端 API (端口 8000)
cd backend && uv run uvicorn server:app --port 8000

# Mock OTel 服务 — Prometheus + Jaeger 模拟 (端口 9090)
cd backend && uv run python mock_otel.py
```

### 安装依赖
```bash
cd frontend && npm install
cd backend && uv sync
```

### Lint 和构建
```bash
cd frontend && npm run lint
cd frontend && npm run build
```

## 架构

### 三服务架构
- **前端** (React 19 + Vite 7, 端口 5173) — SPA，使用 React Router 路由，通过 Vite 开发服务器将 `/api` 代理到后端
- **后端** (`backend/server.py`, FastAPI, 端口 8000) — 提供 Agent/Skill/Project/Chat 的 REST API，集成 Claude Agent SDK 处理对话
- **Mock OTel** (`backend/mock_otel.py`, 端口 9090) — 模拟 5 个微服务的 Prometheus 指标和 Jaeger 链路追踪数据，每 30 秒随机触发服务异常

### 数据流
前端 → `/api/*` (Vite 代理) → FastAPI 后端 → Claude Agent SDK (对话处理) → Skill 调用 Mock OTel 端点查询数据

### 存储抽象层 (`backend/storage/`)
- `base.py`: 抽象 `StorageProvider` 接口 (get_file, put_file, delete_file, list_dir, exists, is_dir)
- `local.py`: 默认本地文件系统存储
- `github.py`: 基于 GitHub API 的远程存储
- `manager.py`: 单例 `StorageManager`，通过 `/api/storage/config` 接口切换存储后端

### 前端状态管理
使用 React Context API，两个 Provider 包裹整个应用：
- `ProjectContext` — 项目 CRUD，从 `/api/projects` 获取数据
- `AgentContext` — 智能体 CRUD，从 `/api/agents` 获取数据

拓扑编辑使用 `@xyflow/react`，Skill 编辑使用 Monaco Editor，Markdown 渲染使用 `react-markdown`。

### 数据格式
- **Agent**: `backend/agents/{agent_id}.md` — YAML frontmatter (name, description, avatar, gradient, model, skills, createdAt) + Markdown 系统提示词
- **Skill**: `backend/skills/{skill_id}/SKILL.md`（SDK 原生 Skill 在 `backend/.claude/skills/`）— YAML frontmatter + Markdown 指令
- **Project**: `backend/projects/{project_id}.json` — 拓扑图 (nodes/edges)、关联 Agent 列表、元数据
- **Chat 历史**: `backend/chat_history/{agent_id}.json` — {role, content} 消息数组

### server.py 关键结构
后端按注释分区组织：Storage Config、Skills、Agents、Projects、Chat。对话接口调用 Claude Agent SDK 的 `query()`，传入 Agent 系统提示词和技能列表，最大 10 轮对话，权限模式为 `acceptEdits`。

## 环境要求

- 需要设置 `ANTHROPIC_API_KEY` 环境变量（或在 backend/.env 文件中配置）
- `PROMETHEUS_URL` 默认为 `http://localhost:9090`
- Node.js 18+, Python 3.10+（推荐 3.13），`uv` 包管理器

## 代码风格

- 前端：ESLint + React Hooks 规范，ES Modules
- 后端：Python 类型注解，Pydantic 数据模型，全程 async/await
