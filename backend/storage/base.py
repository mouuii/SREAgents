"""Base storage provider interface"""

from abc import ABC, abstractmethod
from typing import Optional


class StorageProvider(ABC):
    """存储提供者抽象基类"""
    
    @abstractmethod
    async def get_file(self, path: str) -> Optional[str]:
        """读取文件内容"""
        pass
    
    @abstractmethod
    async def put_file(self, path: str, content: str, message: str = "") -> bool:
        """写入文件内容"""
        pass
    
    @abstractmethod
    async def delete_file(self, path: str, message: str = "") -> bool:
        """删除文件"""
        pass
    
    @abstractmethod
    async def list_dir(self, path: str) -> list[str]:
        """列出目录内容"""
        pass
    
    @abstractmethod
    async def exists(self, path: str) -> bool:
        """检查路径是否存在"""
        pass
    
    @abstractmethod
    async def is_dir(self, path: str) -> bool:
        """检查是否为目录"""
        pass
