"""Local filesystem storage provider"""

from pathlib import Path
from typing import Optional
from .base import StorageProvider


class LocalStorage(StorageProvider):
    """本地文件系统存储"""
    
    def __init__(self, base_path: str | Path):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def _resolve(self, path: str) -> Path:
        """解析相对路径为绝对路径"""
        return self.base_path / path
    
    async def get_file(self, path: str) -> Optional[str]:
        file_path = self._resolve(path)
        if not file_path.exists() or not file_path.is_file():
            return None
        try:
            return file_path.read_text(encoding='utf-8')
        except Exception:
            return None
    
    async def put_file(self, path: str, content: str, message: str = "") -> bool:
        file_path = self._resolve(path)
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding='utf-8')
            return True
        except Exception:
            return False
    
    async def delete_file(self, path: str, message: str = "") -> bool:
        file_path = self._resolve(path)
        try:
            if file_path.is_file():
                file_path.unlink()
            elif file_path.is_dir():
                import shutil
                shutil.rmtree(file_path)
            return True
        except Exception:
            return False
    
    async def list_dir(self, path: str) -> list[str]:
        dir_path = self._resolve(path)
        if not dir_path.exists() or not dir_path.is_dir():
            return []
        return [item.name for item in dir_path.iterdir()]
    
    async def exists(self, path: str) -> bool:
        return self._resolve(path).exists()
    
    async def is_dir(self, path: str) -> bool:
        return self._resolve(path).is_dir()
