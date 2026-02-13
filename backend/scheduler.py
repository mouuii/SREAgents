"""
定时任务调度引擎
基于 APScheduler 实现 Cron 表达式解析和任务调度
"""
import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.job import Job

logger = logging.getLogger("sreagents.scheduler")


class TaskScheduler:
    """定时任务调度器"""

    def __init__(self, tasks_dir: Path, agent_query_func):
        """
        初始化调度器

        Args:
            tasks_dir: 任务存储目录
            agent_query_func: Agent 对话调用函数（接收 agentId, prompt, systemPrompt）
        """
        self.tasks_dir = tasks_dir
        self.tasks_dir.mkdir(exist_ok=True)
        self.agent_query_func = agent_query_func
        self.scheduler = AsyncIOScheduler()
        self._running_tasks: Dict[str, bool] = {}  # 并发控制标记

    async def start(self):
        """启动调度器，加载所有已启用的任务"""
        logger.info("Starting task scheduler...")
        self.scheduler.start()

        # 加载所有已启用的任务
        for task_file in self.tasks_dir.glob("*.json"):
            try:
                task = json.loads(task_file.read_text(encoding="utf-8"))
                if task.get("enabled", False):
                    await self.add_task(task)
                    logger.info(f"Loaded task: {task['id']} - {task['name']}")
            except Exception as e:
                logger.error(f"Failed to load task {task_file}: {e}")

        logger.info(f"Task scheduler started with {len(self.scheduler.get_jobs())} active jobs")

    async def stop(self):
        """停止调度器"""
        logger.info("Stopping task scheduler...")
        self.scheduler.shutdown(wait=True)
        logger.info("Task scheduler stopped")

    async def add_task(self, task: dict):
        """
        添加定时任务到调度器

        Args:
            task: 任务字典（包含 id, cronExpression 等字段）
        """
        task_id = task["id"]
        cron_expr = task["cronExpression"]

        # 解析 Cron 表达式（标准 5 字段格式）
        try:
            cron_parts = cron_expr.split()
            if len(cron_parts) != 5:
                raise ValueError(f"Invalid cron expression: {cron_expr} (expected 5 fields)")

            minute, hour, day, month, day_of_week = cron_parts

            # 创建 CronTrigger
            trigger = CronTrigger(
                minute=minute,
                hour=hour,
                day=day,
                month=month,
                day_of_week=day_of_week
            )

            # 添加任务到调度器
            self.scheduler.add_job(
                self._execute_task_impl,
                trigger=trigger,
                id=task_id,
                args=[task_id],
                replace_existing=True,
                max_instances=1  # 防止同一任务并发执行
            )

            # 更新 nextExecutionAt
            job = self.scheduler.get_job(task_id)
            if job and job.next_run_time:
                task["nextExecutionAt"] = job.next_run_time.isoformat()
                self._save_task(task)

            logger.info(f"Added task {task_id} with cron: {cron_expr}")

        except Exception as e:
            logger.error(f"Failed to add task {task_id}: {e}")
            raise

    async def remove_task(self, task_id: str):
        """从调度器移除任务"""
        try:
            self.scheduler.remove_job(task_id)
            logger.info(f"Removed task {task_id}")
        except Exception as e:
            logger.error(f"Failed to remove task {task_id}: {e}")

    async def update_task(self, task: dict):
        """更新调度器中的任务"""
        task_id = task["id"]

        # 先移除旧任务
        await self.remove_task(task_id)

        # 如果启用，添加新任务
        if task.get("enabled", False):
            await self.add_task(task)

        logger.info(f"Updated task {task_id}")

    async def execute_task(self, task_id: str) -> dict:
        """
        手动触发任务执行

        Returns:
            执行记录字典（包含 id, status, startTime 等）
        """
        return await self._execute_task_impl(task_id, manual=True)

    async def _execute_task_impl(self, task_id: str, manual: bool = False) -> dict:
        """
        任务执行实现（调用 Agent）

        Args:
            task_id: 任务 ID
            manual: 是否手动触发

        Returns:
            执行记录字典
        """
        # 并发控制：同一任务不允许并发执行
        if self._running_tasks.get(task_id, False):
            logger.warning(f"Task {task_id} is already running, skipping execution")
            return {
                "id": f"exec-{int(asyncio.get_event_loop().time() * 1000)}",
                "taskId": task_id,
                "startTime": datetime.now().isoformat(),
                "endTime": datetime.now().isoformat(),
                "status": "skipped",
                "error": "Task is already running"
            }

        self._running_tasks[task_id] = True

        # 加载任务配置
        task_file = self.tasks_dir / f"{task_id}.json"
        if not task_file.exists():
            logger.error(f"Task {task_id} not found")
            self._running_tasks[task_id] = False
            return {
                "id": f"exec-{int(asyncio.get_event_loop().time() * 1000)}",
                "taskId": task_id,
                "startTime": datetime.now().isoformat(),
                "endTime": datetime.now().isoformat(),
                "status": "failed",
                "error": "Task not found"
            }

        try:
            task = json.loads(task_file.read_text(encoding="utf-8"))
        except Exception as e:
            logger.error(f"Failed to load task {task_id}: {e}")
            self._running_tasks[task_id] = False
            return {
                "id": f"exec-{int(asyncio.get_event_loop().time() * 1000)}",
                "taskId": task_id,
                "startTime": datetime.now().isoformat(),
                "endTime": datetime.now().isoformat(),
                "status": "failed",
                "error": f"Failed to load task: {str(e)}"
            }

        # 创建执行记录
        execution_id = f"exec-{int(asyncio.get_event_loop().time() * 1000)}"
        start_time = datetime.now()

        execution = {
            "id": execution_id,
            "taskId": task_id,
            "startTime": start_time.isoformat(),
            "endTime": None,
            "status": "running",
            "result": None,
            "error": None,
            "manual": manual
        }

        # 保存初始执行记录
        self._save_execution(task_id, execution)

        logger.info(f"{'Manually triggered' if manual else 'Scheduled'} execution {execution_id} for task {task_id}")

        try:
            # 调用 Agent 对话接口
            agent_id = task["agentId"]
            prompt = task["prompt"]

            # 收集所有消息
            messages = []
            summary = ""

            async for message in self.agent_query_func(agent_id, prompt):
                # 简化处理：收集所有消息内容
                if hasattr(message, 'content') and message.content:
                    for block in message.content:
                        if hasattr(block, 'text') and block.text:
                            messages.append({
                                "role": "assistant",
                                "content": block.text
                            })
                            summary = block.text[:200]  # 取前 200 字符作为摘要

            # 执行成功
            end_time = datetime.now()
            execution["endTime"] = end_time.isoformat()
            execution["status"] = "success"
            execution["result"] = {
                "messages": messages,
                "summary": summary or "执行完成"
            }

            # 更新任务的 lastExecutedAt
            task["lastExecutedAt"] = end_time.isoformat()
            self._save_task(task)

            logger.info(f"Execution {execution_id} completed successfully in {(end_time - start_time).total_seconds():.2f}s")

        except asyncio.TimeoutError:
            # 执行超时
            end_time = datetime.now()
            execution["endTime"] = end_time.isoformat()
            execution["status"] = "failed"
            execution["error"] = "Task execution timeout (exceeded 10 minutes)"
            logger.error(f"Execution {execution_id} timeout")

        except Exception as e:
            # 执行失败
            end_time = datetime.now()
            execution["endTime"] = end_time.isoformat()
            execution["status"] = "failed"
            execution["error"] = str(e)
            logger.error(f"Execution {execution_id} failed: {e}")

        finally:
            # 保存最终执行记录
            self._save_execution(task_id, execution)

            # 释放并发锁
            self._running_tasks[task_id] = False

        return execution

    def _save_task(self, task: dict):
        """保存任务到文件"""
        task_id = task["id"]
        task_file = self.tasks_dir / f"{task_id}.json"
        task_file.write_text(json.dumps(task, ensure_ascii=False, indent=2), encoding="utf-8")

    def _save_execution(self, task_id: str, execution: dict):
        """保存执行记录到文件"""
        execution_dir = self.tasks_dir / task_id / "executions"
        execution_dir.mkdir(parents=True, exist_ok=True)

        execution_file = execution_dir / f"{execution['id']}.json"
        execution_file.write_text(json.dumps(execution, ensure_ascii=False, indent=2), encoding="utf-8")

    def get_next_run_time(self, task_id: str) -> Optional[datetime]:
        """获取任务的下次执行时间"""
        job = self.scheduler.get_job(task_id)
        if job and job.next_run_time:
            return job.next_run_time
        return None

    def get_all_jobs(self) -> list[Job]:
        """获取所有调度任务"""
        return self.scheduler.get_jobs()

    def validate_cron_expression(self, cron_expr: str) -> bool:
        """
        验证 Cron 表达式是否合法

        Args:
            cron_expr: Cron 表达式（5 字段格式）

        Returns:
            是否合法
        """
        try:
            cron_parts = cron_expr.split()
            if len(cron_parts) != 5:
                return False

            minute, hour, day, month, day_of_week = cron_parts

            # 尝试创建 CronTrigger（会自动验证）
            CronTrigger(
                minute=minute,
                hour=hour,
                day=day,
                month=month,
                day_of_week=day_of_week
            )
            return True
        except Exception:
            return False
