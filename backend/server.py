"""
OpsAgent Platform - Python Backend
使用 Claude Agent SDK 处理智能体对话和技能执行
"""
import asyncio
import os
import json
import logging
import zipfile
import tempfile
import shutil
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("opsagent")

# Load environment variables
load_dotenv()

# Import Claude Agent SDK
try:
    from claude_agent_sdk import query, ClaudeAgentOptions
except ImportError:
    logger.warning("claude-agent-sdk not installed. Run: uv add claude-agent-sdk")
    query = None
    ClaudeAgentOptions = None

# Import storage manager
from storage.manager import storage

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
        "env_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "storage_type": storage.storage_type
    }


# ==================== Storage Config API ====================

class StorageConfig(BaseModel):
    type: str = "local"
    github_token: Optional[str] = None
    github_owner: Optional[str] = None
    github_repo: Optional[str] = None
    github_branch: str = "main"


@app.get("/api/storage/config")
async def get_storage_config():
    """获取存储配置"""
    return storage.get_config()


@app.put("/api/storage/config")
async def update_storage_config(config: StorageConfig):
    """更新存储配置"""
    success = await storage.configure(config.model_dump())
    if success:
        return {"success": True, "config": storage.get_config()}
    raise HTTPException(status_code=500, detail="Failed to configure storage")


# Legacy directories (for backward compatibility)
SKILLS_DIR = Path(__file__).parent / "skills"
SKILLS_DIR.mkdir(exist_ok=True)

AGENTS_DIR = Path(__file__).parent / "agents"
AGENTS_DIR.mkdir(exist_ok=True)

CHAT_HISTORY_DIR = Path(__file__).parent / "chat_history"
CHAT_HISTORY_DIR.mkdir(exist_ok=True)

PROJECTS_DIR = Path(__file__).parent / "projects"
PROJECTS_DIR.mkdir(exist_ok=True)


def parse_skill_file(file_path: Path) -> dict:
    """解析技能 Markdown 文件，提取 frontmatter 和内容"""
    # 尝试多种编码
    content = None
    for encoding in ['utf-8', 'utf-8-sig', 'gbk', 'latin-1']:
        try:
            content = file_path.read_text(encoding=encoding)
            break
        except UnicodeDecodeError:
            continue
    
    if content is None:
        # 最后尝试二进制读取并忽略错误
        content = file_path.read_bytes().decode('utf-8', errors='ignore')
    
    # Parse YAML frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            import yaml
            frontmatter = yaml.safe_load(parts[1])
            instruction = parts[2].strip()
            return {
                "id": file_path.stem,
                "name": frontmatter.get("name", file_path.stem) if frontmatter else file_path.stem,
                "description": frontmatter.get("description", "") if frontmatter else "",
                "icon": frontmatter.get("icon", "🔧") if frontmatter else "🔧",
                "instruction": instruction,
                "config": frontmatter.get("config", {}) if frontmatter else {},
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
    """保存技能为目录结构 (skills/{id}/SKILL.md)"""
    import yaml
    
    skill_dir = SKILLS_DIR / skill['id']
    skill_dir.mkdir(parents=True, exist_ok=True)
    
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
    
    file_path = skill_dir / "SKILL.md"
    file_path.write_text(content, encoding="utf-8")
    return skill_dir


def get_skill_md_path(skill_id: str) -> Optional[Path]:
    """获取 skill 的 SKILL.md 路径，兼容目录和单文件两种结构"""
    # 优先检查目录结构
    skill_dir = SKILLS_DIR / skill_id
    if skill_dir.is_dir():
        for name in ['SKILL.md', 'skill.md', 'Skill.md']:
            md_path = skill_dir / name
            if md_path.exists():
                return md_path
    # 兼容旧的单文件结构
    old_path = SKILLS_DIR / f"{skill_id}.md"
    if old_path.exists():
        return old_path
    return None


@app.get("/api/skills")
async def list_skills():
    """获取所有技能列表"""
    skills = []
    seen_ids = set()
    
    # 扫描目录结构
    for item in SKILLS_DIR.iterdir():
        if item.is_dir() and not item.name.startswith('.'):
            skill_md = None
            for name in ['SKILL.md', 'skill.md', 'Skill.md']:
                if (item / name).exists():
                    skill_md = item / name
                    break
            if skill_md:
                try:
                    skill = parse_skill_file(skill_md)
                    skill["id"] = item.name
                    skills.append(skill)
                    seen_ids.add(item.name)
                except Exception as e:
                    logger.error("Error parsing %s: %s", skill_md, e)
    
    # 兼容旧的单文件结构
    for file_path in SKILLS_DIR.glob("*.md"):
        if file_path.stem not in seen_ids:
            try:
                skill = parse_skill_file(file_path)
                skills.append(skill)
            except Exception as e:
                logger.error("Error parsing %s: %s", file_path, e)
    
    return {"skills": skills}


@app.get("/api/skills/{skill_id}")
async def get_skill(skill_id: str):
    """获取单个技能详情"""
    md_path = get_skill_md_path(skill_id)
    if not md_path:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    skill = parse_skill_file(md_path)
    skill["id"] = skill_id
    return skill


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
    
    skill_dir = SKILLS_DIR / skill_dict['id']
    if skill_dir.exists():
        raise HTTPException(status_code=400, detail=f"Skill '{skill_dict['id']}' already exists")
    
    save_skill_file(skill_dict)
    return {"success": True, "skill": skill_dict}


@app.put("/api/skills/{skill_id}")
async def update_skill(skill_id: str, skill: SkillCreate):
    """更新技能"""
    md_path = get_skill_md_path(skill_id)
    if not md_path:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    skill_dict = skill.model_dump()
    skill_dict["id"] = skill_id
    save_skill_file(skill_dict)
    return {"success": True, "skill": skill_dict}


@app.delete("/api/skills/{skill_id}")
async def delete_skill(skill_id: str):
    """删除技能"""
    skill_dir = SKILLS_DIR / skill_id
    if skill_dir.is_dir():
        shutil.rmtree(skill_dir)
        return {"success": True}
    
    # 兼容旧的单文件
    file_path = SKILLS_DIR / f"{skill_id}.md"
    if file_path.exists():
        file_path.unlink()
        return {"success": True}
    
    raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")


@app.get("/api/skills/{skill_id}/files")
async def list_skill_files(skill_id: str):
    """获取技能目录下的所有文件"""
    skill_dir = SKILLS_DIR / skill_id
    if not skill_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    files = []
    for item in skill_dir.rglob("*"):
        if item.is_file():
            rel_path = str(item.relative_to(skill_dir))
            files.append({
                "name": item.name,
                "path": rel_path,
                "size": item.stat().st_size,
                "isSkillMd": item.name.upper() == "SKILL.MD"
            })
    return {"files": files}


@app.get("/api/skills/{skill_id}/files/{file_path:path}")
async def get_skill_file(skill_id: str, file_path: str):
    """获取技能目录下的单个文件内容"""
    skill_dir = SKILLS_DIR / skill_id
    if not skill_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    target_file = skill_dir / file_path
    if not target_file.exists() or not target_file.is_file():
        raise HTTPException(status_code=404, detail=f"File '{file_path}' not found")
    
    # 安全检查：确保文件在 skill 目录内
    try:
        target_file.resolve().relative_to(skill_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # 读取文件内容
    try:
        content = target_file.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        content = target_file.read_bytes().decode("utf-8", errors="ignore")
    
    return {"path": file_path, "content": content}


class FileContent(BaseModel):
    content: str


@app.put("/api/skills/{skill_id}/files/{file_path:path}")
async def update_skill_file(skill_id: str, file_path: str, body: FileContent):
    """更新技能目录下的单个文件"""
    skill_dir = SKILLS_DIR / skill_id
    if not skill_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    target_file = skill_dir / file_path
    
    # 安全检查
    try:
        target_file.resolve().relative_to(skill_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # 创建父目录
    target_file.parent.mkdir(parents=True, exist_ok=True)
    target_file.write_text(body.content, encoding="utf-8")
    
    return {"success": True}


@app.post("/api/skills/{skill_id}/files")
async def create_skill_file(skill_id: str, file_path: str, body: FileContent):
    """在技能目录下创建新文件"""
    skill_dir = SKILLS_DIR / skill_id
    if not skill_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    target_file = skill_dir / file_path
    
    # 安全检查
    try:
        target_file.resolve().relative_to(skill_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if target_file.exists():
        raise HTTPException(status_code=400, detail=f"File '{file_path}' already exists")
    
    target_file.parent.mkdir(parents=True, exist_ok=True)
    target_file.write_text(body.content, encoding="utf-8")
    
    return {"success": True, "path": file_path}


@app.delete("/api/skills/{skill_id}/files/{file_path:path}")
async def delete_skill_file(skill_id: str, file_path: str):
    """删除技能目录下的文件"""
    skill_dir = SKILLS_DIR / skill_id
    if not skill_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    
    target_file = skill_dir / file_path
    
    # 不允许删除 SKILL.md
    if target_file.name.upper() == "SKILL.MD":
        raise HTTPException(status_code=400, detail="Cannot delete SKILL.md")
    
    # 安全检查
    try:
        target_file.resolve().relative_to(skill_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not target_file.exists():
        raise HTTPException(status_code=404, detail=f"File '{file_path}' not found")
    
    target_file.unlink()
    return {"success": True}


@app.post("/api/skills/upload")
async def upload_skill(
    type: str = Form(...),
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    folderName: Optional[str] = Form(None)
):
    """上传技能文件
    
    支持:
    - 单个 .md 文件
    - .zip 文件（根目录包含 SKILL.md）
    - 文件夹上传（包含 SKILL.md）
    """
    imported_skills = []
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        extracted_dir = tmp_path / "extracted"
        extracted_dir.mkdir()
        
        if type == "file" and file:
            ext = file.filename.split('.')[-1].lower()
            
            if ext == 'md':
                # 直接处理单个 .md 文件
                content = await file.read()
                md_path = extracted_dir / file.filename
                md_path.write_bytes(content)
                
            elif ext in ['zip', 'skill']:
                # 处理压缩包
                content = await file.read()
                zip_path = tmp_path / file.filename
                zip_path.write_bytes(content)
                
                try:
                    with zipfile.ZipFile(zip_path, 'r') as zf:
                        zf.extractall(extracted_dir)
                except zipfile.BadZipFile:
                    raise HTTPException(status_code=400, detail="无效的压缩文件")
            else:
                raise HTTPException(status_code=400, detail="支持 .md、.zip 文件")
                
        elif type == "folder" and files:
            # 处理文件夹上传
            for f in files:
                if not f.filename:
                    continue
                # 保持相对路径结构
                rel_path = f.filename.split('/', 1)[-1] if '/' in f.filename else f.filename
                file_path = extracted_dir / rel_path
                file_path.parent.mkdir(parents=True, exist_ok=True)
                content = await f.read()
                file_path.write_bytes(content)
        else:
            raise HTTPException(status_code=400, detail="无效的上传参数")
        
        # 查找 SKILL.md（优先）或其他 .md 文件
        skill_md = None
        for name in ['SKILL.md', 'skill.md', 'Skill.md']:
            found = list(extracted_dir.rglob(name))
            if found:
                skill_md = found[0]
                break
        
        if not skill_md:
            # 尝试找任意 .md 文件
            md_files = [f for f in extracted_dir.rglob("*.md") 
                       if f.name.lower() not in ['readme.md', 'changelog.md', 'license.md']]
            if md_files:
                skill_md = md_files[0]
        
        if not skill_md:
            raise HTTPException(status_code=400, detail="没有找到 SKILL.md 文件")
        
        try:
            skill = parse_skill_file(skill_md)
            
            # 确定 skill id
            if folderName:
                # 去掉 .skill 后缀
                skill_id = folderName.replace('.skill', '').lower().replace(" ", "-")
            elif skill_md.parent != extracted_dir:
                # 使用包含 SKILL.md 的目录名
                skill_id = skill_md.parent.name.replace('.skill', '').lower().replace(" ", "-")
            else:
                # 使用文件名
                skill_id = skill_md.stem.lower().replace(" ", "-")
            
            skill["id"] = skill_id
            
            # 检查是否已存在，添加后缀避免冲突
            base_id = skill_id
            target_dir = SKILLS_DIR / skill_id
            if target_dir.exists() or (SKILLS_DIR / f"{skill_id}.md").exists():
                i = 1
                while (SKILLS_DIR / f"{base_id}-{i}").exists():
                    i += 1
                skill["id"] = f"{base_id}-{i}"
            
            # 创建目标目录
            target_dir = SKILLS_DIR / skill["id"]
            target_dir.mkdir(parents=True, exist_ok=True)
            
            # 复制所有文件到目标目录
            source_dir = skill_md.parent
            for item in source_dir.iterdir():
                if item.is_file():
                    # 重命名为 SKILL.md（统一格式）
                    if item.name.lower() in ['skill.md']:
                        shutil.copy(item, target_dir / "SKILL.md")
                    else:
                        shutil.copy(item, target_dir / item.name)
                elif item.is_dir():
                    shutil.copytree(item, target_dir / item.name)
            
            imported_skills.append(skill)
            
        except Exception as e:
            logger.error("Error importing skill: %s", e)
            raise HTTPException(status_code=400, detail=f"导入失败: {str(e)}")

    return {
        "success": True,
        "imported": len(imported_skills),
        "skills": imported_skills
    }


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
                "projectId": frontmatter.get("projectId", ""),
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
        "projectId": "",
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
        "projectId": agent.get("projectId", ""),
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
            logger.error("Error parsing %s: %s", file_path, e)
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
    projectId: str = ""
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


# ==================== Chat History API ====================

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatHistoryUpdate(BaseModel):
    messages: list[ChatMessage]


def get_chat_history_path(agent_id: str) -> Path:
    """获取对话历史文件路径"""
    return CHAT_HISTORY_DIR / f"{agent_id}.json"


@app.get("/api/chat/history/{agent_id}")
async def get_chat_history(agent_id: str):
    """获取指定智能体的对话历史"""
    file_path = get_chat_history_path(agent_id)
    if not file_path.exists():
        return {"messages": []}
    
    try:
        data = json.loads(file_path.read_text(encoding="utf-8"))
        return {"messages": data.get("messages", [])}
    except Exception as e:
        logger.error("Error reading chat history: %s", e)
        return {"messages": []}


@app.put("/api/chat/history/{agent_id}")
async def save_chat_history(agent_id: str, history: ChatHistoryUpdate):
    """保存对话历史"""
    file_path = get_chat_history_path(agent_id)
    data = {"messages": [msg.model_dump() for msg in history.messages]}
    file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"success": True}


@app.delete("/api/chat/history/{agent_id}")
async def clear_chat_history(agent_id: str):
    """清空对话历史"""
    file_path = get_chat_history_path(agent_id)
    if file_path.exists():
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
                max_turns=3
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


# ==================== Projects API ====================

def get_project_path(project_id: str) -> Path:
    """获取项目配置文件路径"""
    return PROJECTS_DIR / f"{project_id}.json"


def load_project(project_id: str) -> dict:
    """加载项目配置"""
    file_path = get_project_path(project_id)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return json.loads(file_path.read_text(encoding="utf-8"))


def save_project(project: dict):
    """保存项目配置"""
    file_path = get_project_path(project["id"])
    file_path.write_text(json.dumps(project, ensure_ascii=False, indent=2), encoding="utf-8")


@app.get("/api/projects")
async def list_projects():
    """获取所有项目列表"""
    projects = []
    for file_path in PROJECTS_DIR.glob("*.json"):
        try:
            project = json.loads(file_path.read_text(encoding="utf-8"))
            # 统计智能体数量
            project["agentCount"] = len(project.get("agents", []))
            projects.append(project)
        except Exception as e:
            logger.error("Error loading project %s: %s", file_path, e)
    return {"projects": projects}


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """获取单个项目详情"""
    return load_project(project_id)


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    topology: Optional[dict] = None
    agents: Optional[list[str]] = None


@app.post("/api/projects")
async def create_project(project: ProjectCreate):
    """创建新项目"""
    from datetime import datetime
    project_id = f"proj-{int(asyncio.get_event_loop().time() * 1000)}"
    
    project_data = {
        "id": project_id,
        "name": project.name,
        "description": project.description,
        "createdAt": datetime.now().isoformat(),
        "topology": {"nodes": [], "edges": []},
        "agents": []
    }
    
    save_project(project_data)
    return {"success": True, "project": project_data}


@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, update: ProjectUpdate):
    """更新项目"""
    project = load_project(project_id)
    
    if update.name is not None:
        project["name"] = update.name
    if update.description is not None:
        project["description"] = update.description
    if update.topology is not None:
        project["topology"] = update.topology
    if update.agents is not None:
        project["agents"] = update.agents
    
    save_project(project)
    return {"success": True, "project": project}


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    """删除项目"""
    file_path = get_project_path(project_id)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    file_path.unlink()
    return {"success": True}


@app.get("/api/projects/{project_id}/topology")
async def get_project_topology(project_id: str):
    """获取项目的服务拓扑"""
    project = load_project(project_id)
    return {"topology": project.get("topology", {"nodes": [], "edges": []})}


@app.put("/api/projects/{project_id}/topology")
async def update_project_topology(project_id: str, topology: dict):
    """更新项目的服务拓扑"""
    project = load_project(project_id)
    project["topology"] = topology
    save_project(project)
    return {"success": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
