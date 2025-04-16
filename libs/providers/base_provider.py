from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class TorrentProvider(ABC):
    """Abstract base class for torrent providers"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Return the name of the provider"""
        pass
    
    @property
    @abstractmethod
    def enabled(self) -> bool:
        """Return whether the provider is enabled"""
        pass
    
    @abstractmethod
    def search(self, query: str, category: int = 0) -> List[Dict[str, Any]]:
        """
        Search for torrents
        
        Args:
            query (str): The search query
            category (int, optional): Category ID to filter by. Defaults to 0 (all categories).
            
        Returns:
            List[Dict[str, Any]]: List of torrent results
        """
        pass
    
    @abstractmethod
    def get_torrent_details(self, torrent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get details for a specific torrent
        
        Args:
            torrent_id (str): ID of the torrent
            
        Returns:
            Optional[Dict[str, Any]]: Torrent details or None if not found
        """
        pass
    
    @abstractmethod
    def create_magnet_link(self, info_hash: str, name: str) -> str:
        """
        Create a magnet link for a torrent
        
        Args:
            info_hash (str): Info hash of the torrent
            name (str): Name of the torrent
            
        Returns:
            str: Magnet link
        """
        pass
