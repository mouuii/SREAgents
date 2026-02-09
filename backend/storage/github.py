"""GitHub storage provider using GitHub API"""

import base64
import httpx
from typing import Optional
from .base import StorageProvider


class GitHubStorage(StorageProvider):
    """GitHub 仓库存储"""
    
    def __init__(self, token: str, owner: str, repo: str, branch: str = "main"):
        self.token = token
        self.owner = owner
        self.repo = repo
        self.branch = branch
        self.base_url = f"https://api.github.com/repos/{owner}/{repo}"
        self._cache: dict[str, dict] = {}  # 缓存文件 sha
    
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
    
    async def _get_content(self, path: str) -> Optional[dict]:
        """获取文件/目录内容（含 sha）"""
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/contents/{path}"
            params = {"ref": self.branch}
            resp = await client.get(url, headers=self._headers(), params=params)
            if resp.status_code == 200:
                return resp.json()
            return None
    
    async def get_file(self, path: str) -> Optional[str]:
        data = await self._get_content(path)
        if not data or isinstance(data, list):  # 目录返回 list
            return None
        if data.get("type") != "file":
            return None
        content_b64 = data.get("content", "")
        self._cache[path] = {"sha": data.get("sha")}
        try:
            return base64.b64decode(content_b64).decode("utf-8")
        except Exception:
            return None
    
    async def put_file(self, path: str, content: str, message: str = "") -> bool:
        if not message:
            message = f"Update {path}"
        
        # 获取现有文件的 sha（如果存在）
        sha = None
        if path in self._cache:
            sha = self._cache[path].get("sha")
        else:
            existing = await self._get_content(path)
            if existing and not isinstance(existing, list):
                sha = existing.get("sha")
        
        # 构建请求
        content_b64 = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        payload = {
            "message": message,
            "content": content_b64,
            "branch": self.branch
        }
        if sha:
            payload["sha"] = sha
        
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/contents/{path}"
            resp = await client.put(url, headers=self._headers(), json=payload)
            if resp.status_code in (200, 201):
                data = resp.json()
                self._cache[path] = {"sha": data.get("content", {}).get("sha")}
                return True
            print(f"GitHub put_file error: {resp.status_code} {resp.text}")
            return False
    
    async def delete_file(self, path: str, message: str = "") -> bool:
        if not message:
            message = f"Delete {path}"
        
        # 获取 sha
        sha = None
        if path in self._cache:
            sha = self._cache[path].get("sha")
        else:
            existing = await self._get_content(path)
            if existing and not isinstance(existing, list):
                sha = existing.get("sha")
        
        if not sha:
            return False
        
        payload = {
            "message": message,
            "sha": sha,
            "branch": self.branch
        }
        
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/contents/{path}"
            resp = await client.request("DELETE", url, headers=self._headers(), json=payload)
            if resp.status_code == 200:
                self._cache.pop(path, None)
                return True
            print(f"GitHub delete_file error: {resp.status_code} {resp.text}")
            return False
    
    async def list_dir(self, path: str) -> list[str]:
        data = await self._get_content(path)
        if not data or not isinstance(data, list):
            return []
        return [item["name"] for item in data]
    
    async def exists(self, path: str) -> bool:
        data = await self._get_content(path)
        return data is not None
    
    async def is_dir(self, path: str) -> bool:
        data = await self._get_content(path)
        return isinstance(data, list)
