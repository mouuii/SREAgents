# 定时任务模块设计文档

## 一、数据模型

### 1. 定时任务（Scheduled Task）

存储路径：`backend/scheduled_tasks/{task_id}.json`

```json
{
  "id": "task-1707890123456",
  "name": "每日健康检查",
  "description": "每天凌晨检查所有服务的健康状态",
  "agentId": "agent-123",
  "projectId": "proj-456",
  "cronExpression": "0 0 * * *",
  "prompt": "请检查所有服务的健康状态并生成报告",
  "enabled": true,
  "createdAt": "2026-02-13T10:00:00",
  "updatedAt": "2026-02-13T10:00:00",
  "lastExecutedAt": "2026-02-14T00:00:00",
  "nextExecutionAt": "2026-02-15T00:00:00"
}
```

字段说明：
- `id`: 任务唯一标识
- `name`: 任务名称
- `description`: 任务描述
- `agentId`: 关联的 Agent ID
- `projectId`: 关联的项目 ID（可选）
- `cronExpression`: Cron 表达式（支持标准 5 字段格式）
- `prompt`: 执行时发送给 Agent 的提示词
- `enabled`: 是否启用
- `createdAt`: 创建时间
- `updatedAt`: 更新时间
- `lastExecutedAt`: 上次执行时间
- `nextExecutionAt`: 下次执行时间

### 2. 任务执行历史（Task Execution）

存储路径：`backend/scheduled_tasks/{task_id}/executions/{execution_id}.json`

```json
{
  "id": "exec-1707890234567",
  "taskId": "task-1707890123456",
  "startTime": "2026-02-14T00:00:00",
  "endTime": "2026-02-14T00:01:23",
  "status": "success",
  "result": {
    "messages": [...],
    "summary": "所有服务运行正常"
  },
  "error": null
}
```

字段说明：
- `id`: 执行记录唯一标识
- `taskId`: 关联的任务 ID
- `startTime`: 开始时间
- `endTime`: 结束时间
- `status`: 执行状态（pending、running、success、failed）
- `result`: 执行结果（包含 Agent 对话历史和摘要）
- `error`: 错误信息（失败时）

## 二、调度库选择

**推荐：APScheduler**

理由：
- ✅ 纯 Python 实现，轻量级
- ✅ 支持 Cron 表达式
- ✅ 支持任务持久化
- ✅ 支持多种触发器（cron、interval、date）
- ✅ 与 FastAPI 集成简单

依赖安装：
```bash
uv add apscheduler
```

## 三、API 接口设计

### 3.1 任务管理

#### 创建定时任务
```
POST /api/scheduled-tasks
Content-Type: application/json

{
  "name": "每日健康检查",
  "description": "每天检查服务状态",
  "agentId": "agent-123",
  "projectId": "proj-456",
  "cronExpression": "0 0 * * *",
  "prompt": "请检查所有服务的健康状态",
  "enabled": true
}

Response:
{
  "success": true,
  "task": { ... }
}
```

#### 获取任务列表
```
GET /api/scheduled-tasks
Query params:
  - agentId (optional): 过滤特定 Agent 的任务
  - projectId (optional): 过滤特定项目的任务
  - enabled (optional): 过滤启用/禁用状态

Response:
{
  "tasks": [{ ... }]
}
```

#### 获取任务详情
```
GET /api/scheduled-tasks/{task_id}

Response:
{
  "id": "task-123",
  "name": "...",
  ...
}
```

#### 更新任务
```
PUT /api/scheduled-tasks/{task_id}
Content-Type: application/json

{
  "name": "新名称",
  "cronExpression": "0 1 * * *",
  "enabled": false
}

Response:
{
  "success": true,
  "task": { ... }
}
```

#### 删除任务
```
DELETE /api/scheduled-tasks/{task_id}

Response:
{
  "success": true
}
```

### 3.2 任务控制

#### 启用任务
```
POST /api/scheduled-tasks/{task_id}/enable

Response:
{
  "success": true,
  "task": { ... }
}
```

#### 禁用任务
```
POST /api/scheduled-tasks/{task_id}/disable

Response:
{
  "success": true,
  "task": { ... }
}
```

#### 手动触发执行
```
POST /api/scheduled-tasks/{task_id}/trigger

Response:
{
  "success": true,
  "execution": {
    "id": "exec-123",
    "status": "running"
  }
}
```

### 3.3 执行历史

#### 获取执行历史
```
GET /api/scheduled-tasks/{task_id}/executions
Query params:
  - limit (optional): 限制返回数量，默认 20
  - offset (optional): 偏移量，默认 0

Response:
{
  "executions": [
    {
      "id": "exec-123",
      "startTime": "...",
      "status": "success",
      ...
    }
  ],
  "total": 50
}
```

#### 获取单次执行详情
```
GET /api/scheduled-tasks/{task_id}/executions/{execution_id}

Response:
{
  "id": "exec-123",
  "taskId": "task-123",
  "startTime": "...",
  "endTime": "...",
  "status": "success",
  "result": {
    "messages": [...],
    "summary": "..."
  }
}
```

## 四、后端实现架构

### 4.1 目录结构
```
backend/
├── scheduled_tasks/           # 任务数据目录
│   ├── task-123.json         # 任务定义
│   └── task-123/             # 任务执行历史
│       └── executions/
│           ├── exec-456.json
│           └── exec-789.json
├── scheduler.py              # 调度器核心类
└── server.py                 # FastAPI 路由（添加定时任务 API）
```

### 4.2 核心类设计

#### TaskScheduler (scheduler.py)
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

class TaskScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()

    async def start(self):
        """启动调度器，加载所有已启用的任务"""

    async def stop(self):
        """停止调度器"""

    async def add_task(self, task: dict):
        """添加定时任务到调度器"""

    async def remove_task(self, task_id: str):
        """从调度器移除任务"""

    async def update_task(self, task: dict):
        """更新调度器中的任务"""

    async def execute_task(self, task_id: str):
        """执行单个任务（手动触发）"""

    async def _execute_task_impl(self, task_id: str):
        """任务执行实现（调用 Agent）"""
```

### 4.3 Pydantic 模型
```python
class ScheduledTaskCreate(BaseModel):
    name: str
    description: str = ""
    agentId: str
    projectId: Optional[str] = None
    cronExpression: str
    prompt: str
    enabled: bool = True

class ScheduledTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cronExpression: Optional[str] = None
    prompt: Optional[str] = None
    enabled: Optional[bool] = None
```

## 五、前端实现架构

### 5.1 页面结构
```
frontend/src/pages/
├── ScheduledTaskList.jsx      # 任务列表
├── ScheduledTaskEdit.jsx      # 创建/编辑任务
└── ScheduledTaskDetail.jsx    # 任务详情和执行历史
```

### 5.2 路由配置
```jsx
{
  path: '/scheduled-tasks',
  element: <ScheduledTaskList />
},
{
  path: '/scheduled-tasks/new',
  element: <ScheduledTaskEdit />
},
{
  path: '/scheduled-tasks/:taskId',
  element: <ScheduledTaskDetail />
},
{
  path: '/scheduled-tasks/:taskId/edit',
  element: <ScheduledTaskEdit />
}
```

### 5.3 Context API
```jsx
// ScheduledTaskContext.jsx
const scheduledTasksApi = {
  list: () => fetch('/api/scheduled-tasks'),
  get: (id) => fetch(`/api/scheduled-tasks/${id}`),
  create: (task) => fetch('/api/scheduled-tasks', { method: 'POST', ... }),
  update: (id, task) => fetch(`/api/scheduled-tasks/${id}`, { method: 'PUT', ... }),
  delete: (id) => fetch(`/api/scheduled-tasks/${id}`, { method: 'DELETE' }),
  enable: (id) => fetch(`/api/scheduled-tasks/${id}/enable`, { method: 'POST' }),
  disable: (id) => fetch(`/api/scheduled-tasks/${id}/disable`, { method: 'POST' }),
  trigger: (id) => fetch(`/api/scheduled-tasks/${id}/trigger`, { method: 'POST' }),
  getExecutions: (id) => fetch(`/api/scheduled-tasks/${id}/executions`)
}
```

### 5.4 UI 组件设计

**任务列表页：**
- 表格显示：名称、Agent、Cron 表达式、状态、上次执行时间、操作按钮
- 启用/禁用开关
- 手动触发按钮
- 查看详情/编辑/删除按钮

**创建/编辑页：**
- 表单字段：名称、描述、Agent 选择、项目选择、Cron 表达式、提示词
- Cron 表达式辅助输入（可视化 Cron 生成器）
- 预览下次执行时间

**任务详情页：**
- 任务信息展示
- 执行历史列表（时间、状态、耗时）
- 点击查看执行详情（完整对话记录）

## 六、Cron 表达式说明

标准 5 字段格式：
```
┌───────────── 分钟 (0 - 59)
│ ┌─────────── 小时 (0 - 23)
│ │ ┌───────── 日 (1 - 31)
│ │ │ ┌─────── 月 (1 - 12)
│ │ │ │ ┌───── 星期 (0 - 6) (0 = 星期日)
│ │ │ │ │
* * * * *
```

示例：
- `0 0 * * *` - 每天凌晨 00:00
- `0 */6 * * *` - 每 6 小时
- `0 9 * * 1-5` - 工作日上午 9:00
- `*/15 * * * *` - 每 15 分钟

## 七、错误处理

1. **Cron 表达式验证**：创建/更新时验证表达式格式
2. **Agent 存在性检查**：确保关联的 Agent 存在
3. **执行超时**：设置任务执行超时时间（如 10 分钟）
4. **失败重试**：可选的失败重试机制（重试次数、间隔）
5. **并发控制**：同一任务不允许并发执行

## 八、实施步骤

1. ✅ 完成设计文档（当前任务）
2. 后端实现：
   - 安装 APScheduler
   - 实现 TaskScheduler 类
   - 添加 API 路由和 Pydantic 模型
   - 在 server.py 启动时初始化调度器
3. 前端实现：
   - 创建 ScheduledTaskContext
   - 实现三个页面组件
   - 添加路由和侧边栏入口
4. 测试与文档：
   - 端到端测试
   - 更新 README 和 CLAUDE.md
