"""Storage manager - handles storage provider selection and data operations"""

import json
import yaml
from pathlib import Path
from typing import Optional
from .base import StorageProvider
from .local import LocalStorage
from .github import GitHubStorage


class StorageManager:
    """存储管理器 - 统一管理 skills、projects、agents"""
    
    def __init__(self):
        self.provider: Optional[StorageProvider] = None
        self.config_path = Path(__file__).parent.parent / "storage_config.json"
        self._load_config()
    
    def _load_config(self):
        """加载存储配置"""
        if self.config_path.exists():
            config = json.loads(self.config_path.read_text())
            self._init_provider(config)
        else:
            # 默认使用本地存储
            self._init_local()
    
    def _init_local(self):
        """初始化本地存储"""
        base_path = Path(__file__).parent.parent
        self.provider = LocalStorage(base_path)
        self.storage_type = "local"
    
    def _init_provider(self, config: dict):
        """根据配置初始化存储提供者"""
        storage_type = config.get("type", "local")
        
        if storage_type == "github":
            self.provider = GitHubStorage(
                token=config.get("github_token", ""),
                owner=config.get("github_owner", ""),
                repo=config.get("github_repo", ""),
                branch=config.get("github_branch", "main")
            )
            self.storage_type = "github"
        else:
            self._init_local()
    
    async def configure(self, config: dict) -> bool:
        """配置存储后端"""
        try:
            self._init_provider(config)
            # 保存配置
            self.config_path.write_text(json.dumps(config, indent=2))
            return True
        except Exception as e:
            print(f"Configure storage error: {e}")
            return False
    
    def get_config(self) -> dict:
        """获取当前配置"""
        if self.config_path.exists():
            config = json.loads(self.config_path.read_text())
            # 隐藏 token
            if "github_token" in config:
                config["github_token"] = "***" if config["github_token"] else ""
            return config
        return {"type": "local"}
    
    # ==================== Skills ====================
    
    async def list_skills(self) -> list[dict]:
        """列出所有技能"""
        skills = []
        items = await self.provider.list_dir("skills")
        
        for item in items:
            skill_path = f"skills/{item}"
            if await self.provider.is_dir(skill_path):
                # 目录结构
                skill_md = await self.provider.get_file(f"{skill_path}/SKILL.md")
                if skill_md:
                    skill = self._parse_skill_md(skill_md)
                    skill["id"] = item
                    skills.append(skill)
            elif item.endswith(".md"):
                # 单文件结构
                content = await self.provider.get_file(skill_path)
                if content:
                    skill = self._parse_skill_md(content)
                    skill["id"] = item[:-3]  # 去掉 .md
                    skills.append(skill)
        
        return skills
    
    async def get_skill(self, skill_id: str) -> Optional[dict]:
        """获取单个技能"""
        # 先尝试目录结构
        skill_md = await self.provider.get_file(f"skills/{skill_id}/SKILL.md")
        if skill_md:
            skill = self._parse_skill_md(skill_md)
            skill["id"] = skill_id
            return skill
        
        # 再尝试单文件
        skill_md = await self.provider.get_file(f"skills/{skill_id}.md")
        if skill_md:
            skill = self._parse_skill_md(skill_md)
            skill["id"] = skill_id
            return skill
        
        return None
    
    async def save_skill(self, skill: dict) -> bool:
        """保存技能"""
        skill_id = skill.get("id", "")
        if not skill_id:
            return False
        
        content = self._build_skill_md(skill)
        path = f"skills/{skill_id}/SKILL.md"
        return await self.provider.put_file(path, content, f"Update skill: {skill_id}")
    
    async def delete_skill(self, skill_id: str) -> bool:
        """删除技能"""
        # 尝试删除目录
        if await self.provider.is_dir(f"skills/{skill_id}"):
            # GitHub 不支持直接删除目录，需要逐个删除文件
            files = await self.provider.list_dir(f"skills/{skill_id}")
            for f in files:
                await self.provider.delete_file(f"skills/{skill_id}/{f}", f"Delete skill file: {f}")
            return True
        
        # 尝试删除单文件
        return await self.provider.delete_file(f"skills/{skill_id}.md", f"Delete skill: {skill_id}")
    
    # ==================== Projects ====================
    
    async def list_projects(self) -> list[dict]:
        """列出所有项目"""
        projects = []
        items = await self.provider.list_dir("projects")
        
        for item in items:
            if await self.provider.is_dir(f"projects/{item}"):
                project_json = await self.provider.get_file(f"projects/{item}/project.json")
                if project_json:
                    try:
                        project = json.loads(project_json)
                        project["id"] = item
                        projects.append(project)
                    except json.JSONDecodeError:
                        pass
            elif item.endswith(".json"):
                # 兼容旧的单文件结构
                content = await self.provider.get_file(f"projects/{item}")
                if content:
                    try:
                        project = json.loads(content)
                        projects.append(project)
                    except json.JSONDecodeError:
                        pass
        
        return projects
    
    async def get_project(self, project_id: str) -> Optional[dict]:
        """获取项目"""
        # 先尝试目录结构
        content = await self.provider.get_file(f"projects/{project_id}/project.json")
        if content:
            try:
                project = json.loads(content)
                project["id"] = project_id
                return project
            except json.JSONDecodeError:
                pass
        
        # 兼容旧结构
        content = await self.provider.get_file(f"projects/{project_id}.json")
        if content:
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                pass
        
        return None
    
    async def save_project(self, project: dict) -> bool:
        """保存项目"""
        project_id = project.get("id", "")
        if not project_id:
            return False
        
        content = json.dumps(project, ensure_ascii=False, indent=2)
        path = f"projects/{project_id}/project.json"
        return await self.provider.put_file(path, content, f"Update project: {project_id}")
    
    async def delete_project(self, project_id: str) -> bool:
        """删除项目"""
        # 删除项目目录下所有文件
        if await self.provider.is_dir(f"projects/{project_id}"):
            files = await self.provider.list_dir(f"projects/{project_id}")
            for f in files:
                if await self.provider.is_dir(f"projects/{project_id}/{f}"):
                    # 递归删除子目录（如 agents）
                    sub_files = await self.provider.list_dir(f"projects/{project_id}/{f}")
                    for sf in sub_files:
                        await self.provider.delete_file(
                            f"projects/{project_id}/{f}/{sf}",
                            f"Delete project file"
                        )
                else:
                    await self.provider.delete_file(
                        f"projects/{project_id}/{f}",
                        f"Delete project file"
                    )
            return True
        
        # 兼容旧结构
        return await self.provider.delete_file(f"projects/{project_id}.json", f"Delete project: {project_id}")
    
    # ==================== Topology ====================
    
    async def get_topology(self, project_id: str) -> dict:
        """获取项目拓扑"""
        content = await self.provider.get_file(f"projects/{project_id}/topology.json")
        if content:
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                pass
        
        # 从 project.json 中获取
        project = await self.get_project(project_id)
        if project:
            return project.get("topology", {"nodes": [], "edges": []})
        
        return {"nodes": [], "edges": []}
    
    async def save_topology(self, project_id: str, topology: dict) -> bool:
        """保存项目拓扑"""
        content = json.dumps(topology, ensure_ascii=False, indent=2)
        path = f"projects/{project_id}/topology.json"
        return await self.provider.put_file(path, content, f"Update topology: {project_id}")
    
    # ==================== Agents ====================
    
    async def list_agents(self, project_id: Optional[str] = None) -> list[dict]:
        """列出智能体"""
        agents = []
        
        if project_id:
            # 项目下的智能体
            items = await self.provider.list_dir(f"projects/{project_id}/agents")
            for item in items:
                if item.endswith(".md"):
                    content = await self.provider.get_file(f"projects/{project_id}/agents/{item}")
                    if content:
                        agent = self._parse_agent_md(content)
                        agent["id"] = item[:-3]
                        agent["projectId"] = project_id
                        agents.append(agent)
        else:
            # 所有项目的智能体
            projects = await self.list_projects()
            for project in projects:
                pid = project.get("id", "")
                if pid:
                    project_agents = await self.list_agents(pid)
                    agents.extend(project_agents)
        
        return agents
    
    async def get_agent(self, agent_id: str, project_id: Optional[str] = None) -> Optional[dict]:
        """获取智能体"""
        if project_id:
            content = await self.provider.get_file(f"projects/{project_id}/agents/{agent_id}.md")
            if content:
                agent = self._parse_agent_md(content)
                agent["id"] = agent_id
                agent["projectId"] = project_id
                return agent
        else:
            # 搜索所有项目
            projects = await self.list_projects()
            for project in projects:
                pid = project.get("id", "")
                agent = await self.get_agent(agent_id, pid)
                if agent:
                    return agent
        
        return None
    
    async def save_agent(self, agent: dict) -> bool:
        """保存智能体"""
        agent_id = agent.get("id", "")
        project_id = agent.get("projectId", "")
        if not agent_id or not project_id:
            return False
        
        content = self._build_agent_md(agent)
        path = f"projects/{project_id}/agents/{agent_id}.md"
        return await self.provider.put_file(path, content, f"Update agent: {agent_id}")
    
    async def delete_agent(self, agent_id: str, project_id: str) -> bool:
        """删除智能体"""
        path = f"projects/{project_id}/agents/{agent_id}.md"
        return await self.provider.delete_file(path, f"Delete agent: {agent_id}")
    
    # ==================== Helpers ====================
    
    def _parse_skill_md(self, content: str) -> dict:
        """解析 SKILL.md"""
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    frontmatter = yaml.safe_load(parts[1])
                    instruction = parts[2].strip()
                    return {
                        "name": frontmatter.get("name", ""),
                        "description": frontmatter.get("description", ""),
                        "icon": frontmatter.get("icon", "🔧"),
                        "instruction": instruction,
                        "config": frontmatter.get("config", {})
                    }
                except yaml.YAMLError:
                    pass
        
        return {
            "name": "",
            "description": "",
            "icon": "🔧",
            "instruction": content,
            "config": {}
        }
    
    def _build_skill_md(self, skill: dict) -> str:
        """构建 SKILL.md"""
        frontmatter = {
            "name": skill.get("name", ""),
            "description": skill.get("description", ""),
            "icon": skill.get("icon", "🔧"),
        }
        if skill.get("config"):
            frontmatter["config"] = skill["config"]
        
        return f"""---
{yaml.dump(frontmatter, allow_unicode=True, default_flow_style=False).strip()}
---

{skill.get("instruction", "")}
"""
    
    def _parse_agent_md(self, content: str) -> dict:
        """解析 Agent Markdown"""
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    frontmatter = yaml.safe_load(parts[1])
                    system_prompt = parts[2].strip()
                    return {
                        "name": frontmatter.get("name", ""),
                        "description": frontmatter.get("description", ""),
                        "avatar": frontmatter.get("avatar", "🤖"),
                        "gradient": frontmatter.get("gradient", "gradient-1"),
                        "model": frontmatter.get("model", "claude-3"),
                        "skills": frontmatter.get("skills", []),
                        "createdAt": frontmatter.get("createdAt", ""),
                        "systemPrompt": system_prompt
                    }
                except yaml.YAMLError:
                    pass
        
        return {
            "name": "",
            "description": "",
            "avatar": "🤖",
            "gradient": "gradient-1",
            "model": "claude-3",
            "skills": [],
            "createdAt": "",
            "systemPrompt": content
        }
    
    def _build_agent_md(self, agent: dict) -> str:
        """构建 Agent Markdown"""
        frontmatter = {
            "name": agent.get("name", ""),
            "description": agent.get("description", ""),
            "avatar": agent.get("avatar", "🤖"),
            "gradient": agent.get("gradient", "gradient-1"),
            "model": agent.get("model", "claude-3"),
            "skills": agent.get("skills", []),
            "createdAt": agent.get("createdAt", ""),
        }
        
        return f"""---
{yaml.dump(frontmatter, allow_unicode=True, default_flow_style=False).strip()}
---

{agent.get("systemPrompt", "")}
"""


# 全局单例
storage = StorageManager()
