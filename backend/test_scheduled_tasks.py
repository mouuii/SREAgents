#!/usr/bin/env python3
"""
定时任务 API 测试脚本
"""
import asyncio
import aiohttp
import json

BASE_URL = "http://localhost:8000"


async def test_scheduled_tasks_api():
    """测试定时任务 API"""
    async with aiohttp.ClientSession() as session:
        print("=" * 60)
        print("测试定时任务 API")
        print("=" * 60)

        # 1. 获取 Agent 列表（用于创建任务）
        print("\n1. 获取 Agent 列表...")
        async with session.get(f"{BASE_URL}/api/agents") as resp:
            agents_data = await resp.json()
            agents = agents_data.get("agents", [])
            if not agents:
                print("   ❌ 没有可用的 Agent，请先创建 Agent")
                return
            agent_id = agents[0]["id"]
            print(f"   ✅ 找到 Agent: {agent_id} - {agents[0]['name']}")

        # 2. 创建定时任务
        print("\n2. 创建定时任务...")
        task_data = {
            "name": "测试定时任务",
            "description": "每分钟执行一次的测试任务",
            "agentId": agent_id,
            "cronExpression": "*/1 * * * *",  # 每分钟
            "prompt": "请报告当前时间",
            "enabled": False  # 先禁用，避免真的执行
        }
        async with session.post(
            f"{BASE_URL}/api/scheduled-tasks",
            json=task_data
        ) as resp:
            if resp.status == 200:
                result = await resp.json()
                task = result.get("task", {})
                task_id = task["id"]
                print(f"   ✅ 创建成功: {task_id}")
                print(f"      名称: {task['name']}")
                print(f"      Cron: {task['cronExpression']}")
                print(f"      状态: {'已启用' if task['enabled'] else '已禁用'}")
            else:
                error = await resp.text()
                print(f"   ❌ 创建失败: {error}")
                return

        # 3. 获取任务列表
        print("\n3. 获取任务列表...")
        async with session.get(f"{BASE_URL}/api/scheduled-tasks") as resp:
            result = await resp.json()
            tasks = result.get("tasks", [])
            print(f"   ✅ 找到 {len(tasks)} 个任务")
            for t in tasks:
                print(f"      - {t['id']}: {t['name']} ({'启用' if t['enabled'] else '禁用'})")

        # 4. 获取任务详情
        print("\n4. 获取任务详情...")
        async with session.get(f"{BASE_URL}/api/scheduled-tasks/{task_id}") as resp:
            task = await resp.json()
            print(f"   ✅ 任务详情:")
            print(f"      ID: {task['id']}")
            print(f"      名称: {task['name']}")
            print(f"      描述: {task['description']}")
            print(f"      Agent: {task['agentId']}")
            print(f"      Cron: {task['cronExpression']}")
            print(f"      提示词: {task['prompt']}")

        # 5. 更新任务
        print("\n5. 更新任务...")
        update_data = {
            "description": "更新后的描述",
            "cronExpression": "0 * * * *"  # 改为每小时
        }
        async with session.put(
            f"{BASE_URL}/api/scheduled-tasks/{task_id}",
            json=update_data
        ) as resp:
            if resp.status == 200:
                result = await resp.json()
                task = result.get("task", {})
                print(f"   ✅ 更新成功")
                print(f"      新描述: {task['description']}")
                print(f"      新 Cron: {task['cronExpression']}")
            else:
                error = await resp.text()
                print(f"   ❌ 更新失败: {error}")

        # 6. 启用任务
        print("\n6. 启用任务...")
        async with session.post(f"{BASE_URL}/api/scheduled-tasks/{task_id}/enable") as resp:
            if resp.status == 200:
                result = await resp.json()
                task = result.get("task", {})
                print(f"   ✅ 启用成功")
                print(f"      下次执行: {task.get('nextExecutionAt', 'N/A')}")
            else:
                error = await resp.text()
                print(f"   ❌ 启用失败: {error}")

        # 7. 禁用任务
        print("\n7. 禁用任务...")
        async with session.post(f"{BASE_URL}/api/scheduled-tasks/{task_id}/disable") as resp:
            if resp.status == 200:
                print(f"   ✅ 禁用成功")
            else:
                error = await resp.text()
                print(f"   ❌ 禁用失败: {error}")

        # 8. 手动触发任务（会实际执行 Agent）
        print("\n8. 手动触发任务...")
        print("   ⚠️  跳过实际执行测试（需要有效的 ANTHROPIC_API_KEY）")
        # async with session.post(f"{BASE_URL}/api/scheduled-tasks/{task_id}/trigger") as resp:
        #     if resp.status == 200:
        #         result = await resp.json()
        #         execution = result.get("execution", {})
        #         print(f"   ✅ 触发成功")
        #         print(f"      执行 ID: {execution['id']}")
        #         print(f"      状态: {execution['status']}")
        #     else:
        #         error = await resp.text()
        #         print(f"   ❌ 触发失败: {error}")

        # 9. 获取执行历史
        print("\n9. 获取执行历史...")
        async with session.get(f"{BASE_URL}/api/scheduled-tasks/{task_id}/executions") as resp:
            if resp.status == 200:
                result = await resp.json()
                executions = result.get("executions", [])
                total = result.get("total", 0)
                print(f"   ✅ 找到 {total} 条执行记录")
                for ex in executions[:5]:  # 只显示前 5 条
                    print(f"      - {ex['id']}: {ex['status']} ({ex['startTime']})")
            else:
                error = await resp.text()
                print(f"   ❌ 获取失败: {error}")

        # 10. 删除任务
        print("\n10. 删除任务...")
        async with session.delete(f"{BASE_URL}/api/scheduled-tasks/{task_id}") as resp:
            if resp.status == 200:
                print(f"   ✅ 删除成功")
            else:
                error = await resp.text()
                print(f"   ❌ 删除失败: {error}")

        print("\n" + "=" * 60)
        print("测试完成")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_scheduled_tasks_api())
