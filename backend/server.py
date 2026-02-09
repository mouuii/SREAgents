"""
OpsAgent Platform - Python Backend
使用 Claude Agent SDK 处理智能体对话和技能执行
"""
import asyncio
import os
import json
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import Claude Agent SDK
try:
    from claude_agent_sdk import query, ClaudeAgentOptions
except ImportError:
    print("Warning: claude-agent-sdk not installed. Run: uv add claude-agent-sdk")
    query = None
    ClaudeAgentOptions = None

app = FastAPI(title="OpsAgent Platform API", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    agentId: str
    message: str
    systemPrompt: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    toolsUsed: list[str] = []


@app.get("/")
async def root():
    return {"status": "ok", "message": "OpsAgent Platform API"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "claude_sdk_available": query is not None,
        "env_configured": bool(os.getenv("ANTHROPIC_API_KEY"))
    }


# Skills directory
SKILLS_DIR = Path(__file__).parent / "skills"
SKILLS_DIR.mkdir(exist_ok=True)

# Agents directory
AGENTS_DIR = Path(__file__).parent / "agents"
AGENTS_DIR.mkdir(exist_ok=True)


def parse_skill_file(file_path: Path) -> dict:
    """解析技能 Markdown 文件，提取 frontmatter 和内容"""
    content = file_path.read_text(encoding="utf-8")
    
    # Parse YAML frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            import yaml
            frontmatter = yaml.safe_load(parts[1])
            instruction = parts[2].strip()
            return {
                "id": file_path.stem,
                "name": frontmatter.get("name", file_path.stem),
                "description": frontmatter.get("description", ""),
                "icon": frontmatter.get("icon", "🔧"),
                "instruction": instruction,
                "config": frontmatter.get("config", {}),
                "documents": []
            }
    
    # No frontmatter
    return {
        "id": file_path.stem,
        "name": file_path.stem,
        "description": "",
        "icon": "🔧",
        "instruction": content,
        "config": {},
        "documents": []
    }


def save_skill_file(skill: dict):
    """保存技能为 Markdown 文件"""
    import yaml
    
    frontmatter = {
        "name": skill.get("name", ""),
        "description": skill.get("description", ""),
        "icon": skill.get("icon", "🔧"),
    }
    if skill.get("config"):
        frontmatter["config"] = skill["config"]
    
    content = f"""---
{yaml.dump(frontmatter, allow_unicode=True, default_flow_style=False).strip()}
---

{skill.get("instruction", "")}
"""
    
    file_path = SKILLS_DIR / f"{skill['id']}.md"
    file_path.write_text(content, encoding="utf-8")
    return file_path


@app.get("/api/skills")
async def list_skills():
    """获取所有技能列表"""
    skills = []
    for file_path in SKILLS_DIR.glob("*.md"):
        try:
            skill = parse_skill_file(file_path)
            skills.append(skill)
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
    return {"skills": skills}


@app.get("/api/skills/{skill_id}")
async def get_skill(skill_id: str):
    """获取单个技能详情"""
    file_path = SKILLS_DIR / f"{skill_id}.md"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    return parse_skill_file(file_path)


class SkillCreate(BaseModel):
    id: Optional[str] = None
    name: str
    description: str = ""
    icon: str = "🔧"
    instruction: str = ""
    config: dict = {}


@app.post("/api/skills")
async def create_skill(skill: SkillCreate):
    """创建新技能"""
    skill_dict = skill.model_dump()
    if not skill_dict.get("id"):
        skill_dict["id"] = skill_dict["name"].lower().replace(" ", "-")
    
    file_path = SKILLS_DIR / f"{skill_dict['id']}.md"
    if file_path.exists():
        raise HTTPException(status_code=400, detail=f"Skill '{skill_dict['id']}' already exists")
    
    save_skill_file(skill_dict)
    return {"success": True, "skill": skill_dict}


@app.put("/api/skills/{skill_id}")
async def update_skill(skill_id: str, skill: SkillCreate):
    """更新技能"""
    file_path = SKILLS_DIR / f"{skill_id}.md"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    skill_dict = skill.model_dump()
    skill_dict["id"] = skill_id
    save_skill_file(skill_dict)
    return {"success": True, "skill": skill_dict}


@app.delete("/api/skills/{skill_id}")
async def delete_skill(skill_id: str):
    """删除技能"""
    file_path = SKILLS_DIR / f"{skill_id}.md"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    file_path.unlink()
    return {"success": True}


# ==================== Agents API ====================

def parse_agent_file(file_path: Path) -> dict:
    """解析智能体 Markdown 文件"""
    import yaml
    content = file_path.read_text(encoding="utf-8")
    
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            frontmatter = yaml.safe_load(parts[1])
            system_prompt = parts[2].strip()
            return {
                "id": file_path.stem,
                "name": frontmatter.get("name", file_path.stem),
                "description": frontmatter.get("description", ""),
                "avatar": frontmatter.get("avatar", "🤖"),
                "gradient": frontmatter.get("gradient", "gradient-1"),
                "model": frontmatter.get("model", "claude-3"),
                "skills": frontmatter.get("skills", []),
                "createdAt": frontmatter.get("createdAt", ""),
                "systemPrompt": system_prompt
            }
    
    return {
        "id": file_path.stem,
        "name": file_path.stem,
        "description": "",
        "avatar": "🤖",
        "gradient": "gradient-1",
        "model": "claude-3",
        "skills": [],
        "createdAt": "",
        "systemPrompt": content
    }


def save_agent_file(agent: dict):
    """保存智能体为 Markdown 文件"""
    import yaml
    
    frontmatter = {
        "name": agent.get("name", ""),
        "description": agent.get("description", ""),
        "avatar": agent.get("avatar", "🤖"),
        "gradient": agent.get("gradient", "gradient-1"),
        "model": agent.get("model", "claude-3"),
        "skills": agent.get("skills", []),
        "createdAt": agent.get("createdAt", ""),
    }
    
    content = f"""---
{yaml.dump(frontmatter, allow_unicode=True, default_flow_style=False).strip()}
---

{agent.get("systemPrompt", "")}
"""
    
    file_path = AGENTS_DIR / f"{agent['id']}.md"
    file_path.write_text(content, encoding="utf-8")
    return file_path


@app.get("/api/agents")
async def list_agents():
    """获取所有智能体列表"""
    agents = []
    for file_path in AGENTS_DIR.glob("*.md"):
        try:
            agent = parse_agent_file(file_path)
            agents.append(agent)
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
    return {"agents": agents}


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    """获取单个智能体详情"""
    file_path = AGENTS_DIR / f"{agent_id}.md"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return parse_agent_file(file_path)


class AgentCreate(BaseModel):
    id: Optional[str] = None
    name: str
    description: str = ""
    avatar: str = "🤖"
    gradient: str = "gradient-1"
    model: str = "claude-3"
    skills: list[str] = []
    createdAt: str = ""
    systemPrompt: str = ""


@app.post("/api/agents")
async def create_agent(agent: AgentCreate):
    """创建新智能体"""
    agent_dict = agent.model_dump()
    if not agent_dict.get("id"):
        agent_dict["id"] = f"agent-{int(asyncio.get_event_loop().time() * 1000)}"
    if not agent_dict.get("createdAt"):
        from datetime import datetime
        agent_dict["createdAt"] = datetime.now().strftime("%Y/%m/%d")
    
    file_path = AGENTS_DIR / f"{agent_dict['id']}.md"
    if file_path.exists():
        raise HTTPException(status_code=400, detail=f"Agent '{agent_dict['id']}' already exists")
    
    save_agent_file(agent_dict)
    return {"success": True, "agent": agent_dict}


@app.put("/api/agents/{agent_id}")
async def update_agent(agent_id: str, agent: AgentCreate):
    """更新智能体"""
    file_path = AGENTS_DIR / f"{agent_id}.md"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    
    agent_dict = agent.model_dump()
    agent_dict["id"] = agent_id
    save_agent_file(agent_dict)
    return {"success": True, "agent": agent_dict}


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """删除智能体"""
    file_path = AGENTS_DIR / f"{agent_id}.md"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    
    file_path.unlink()
    return {"success": True}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """处理智能体对话请求 - 使用 SDK 原生 Skills"""
    
    if not query:
        raise HTTPException(
            status_code=500, 
            detail="Claude Agent SDK not installed. Run: uv add claude-agent-sdk"
        )
    
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY not configured in .env"
        )
    
    # 获取 agent 的 system prompt
    system_prompt = request.systemPrompt or "你是一个智能运维助手。"
    
    full_response = []
    tools_used = []
    
    try:
        # Use Claude Agent SDK with native Skills support
        async for message in query(
            prompt=request.message,
            options=ClaudeAgentOptions(
                system_prompt=system_prompt,
                cwd=str(Path(__file__).parent),  # backend 目录，包含 .claude/skills/
                setting_sources=["project"],  # 从项目目录加载 Skills
                allowed_tools=["Skill", "Read", "Bash", "Glob", "WebFetch"],  # 启用 Skill 工具
                permission_mode="acceptEdits",
                max_turns=10
            )
        ):
            # Collect text responses
            if hasattr(message, 'content'):
                for block in message.content:
                    if hasattr(block, 'text'):
                        full_response.append(block.text)
                    elif hasattr(block, 'name'):
                        tools_used.append(block.name)
        
        return ChatResponse(
            response="\n".join(full_response) if full_response else "任务已完成。",
            toolsUsed=tools_used
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/skills/execute")
async def execute_skill(skill_name: str, params: dict = {}):
    """直接执行指定技能"""
    
    # 预定义技能执行逻辑
    skill_handlers = {
        "prometheus": execute_prometheus_skill,
    }
    
    handler = skill_handlers.get(skill_name)
    if not handler:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")
    
    try:
        result = await handler(params)
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def execute_prometheus_skill(params: dict) -> dict:
    """执行 Prometheus 技能 - 查询监控指标"""
    import aiohttp
    
    prometheus_url = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
    query_str = params.get("query", "up")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{prometheus_url}/api/v1/query",
            params={"query": query_str}
        ) as resp:
            if resp.status == 200:
                return await resp.json()
            else:
                text = await resp.text()
                raise Exception(f"Prometheus query failed: {text}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
