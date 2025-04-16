from typing import List, Dict, Any, Optional
import urllib.parse
import datetime
import random

from libs.providers.base_provider import TorrentProvider

class SampleProvider(TorrentProvider):
    """
    Sample torrent provider implementation for demonstration purposes.
    This provider doesn't actually connect to any real service.
    """
    
    def __init__(self):
        self._enabled = False  # Default to disabled
    
    @property
    def name(self) -> str:
        return "Sample Provider"
    
    @property
    def enabled(self) -> bool:
        return self._enabled
    
    @enabled.setter
    def enabled(self, value: bool):
        self._enabled = value
    
    def get_trackers(self):
        """Return a string of trackers for magnet links"""
        trackers = [
            'udp://tracker.opentrackr.org:1337',
            'udp://open.stealth.si:80/announce',
            'udp://tracker.torrent.eu.org:451/announce',
        ]
        
        return ''.join([f'&tr={urllib.parse.quote(tracker)}' for tracker in trackers])
    
    def create_magnet_link(self, info_hash: str, name: str) -> str:
        """Create a magnet link for a torrent"""
        trackers = self.get_trackers()
        return f"magnet:?xt=urn:btih:{info_hash}&dn={urllib.parse.quote(name)}{trackers}"
    
    def format_size(self, size):
        """Format size in bytes to a human-readable format"""
        if size >= 1073741824:  # GiB
            return f"{round(size / 1073741824, 2)} GiB"
        elif size >= 1048576:  # MiB
            return f"{round(size / 1048576, 2)} MiB"
        elif size >= 1024:  # KiB
            return f"{round(size / 1024, 2)} KiB"
        else:
            return f"{size} B"
    
    def search(self, query: str, category: int = 0) -> List[Dict[str, Any]]:
        """
        Generate sample search results
        
        This is just a demonstration and returns fake data
        """
        if not self.enabled:
            print("[INFO] Sample provider is disabled")
            return []
        
        print(f"[INFO] Sample provider searching for: {query}")
        
        # Generate some fake results
        results = []
        for i in range(5):
            # Create a fake info hash
            info_hash = ''.join(random.choices('0123456789abcdef', k=40))
            
            # Create a result with the query in the name
            result = {
                'id': str(i + 1),
                'name': f"{query} - Sample Result {i + 1}",
                'info_hash': info_hash,
                'leechers': random.randint(0, 100),
                'seeders': random.randint(10, 1000),
                'num_files': random.randint(1, 10),
                'size': random.randint(100000000, 10000000000),  # Random size between 100MB and 10GB
                'username': 'SampleUser',
                'added': int(datetime.datetime.now().timestamp()) - random.randint(0, 30*24*60*60),  # Random time in the last 30 days
                'status': 'vip',
                'category': str(200 + random.randint(1, 12)),  # Random video category
                'imdb': '',
                'provider': self.name
            }
            
            results.append(result)
        
        return results
    
    def get_torrent_details(self, torrent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get details for a specific torrent
        
        This is just a demonstration and returns fake data
        """
        if not self.enabled:
            print("[INFO] Sample provider is disabled")
            return None
        
        # Create a fake info hash
        info_hash = ''.join(random.choices('0123456789abcdef', k=40))
        
        # Create a fake result
        details = {
            'id': torrent_id,
            'name': f"Sample Torrent {torrent_id}",
            'info_hash': info_hash,
            'leechers': random.randint(0, 100),
            'seeders': random.randint(10, 1000),
            'num_files': random.randint(1, 10),
            'size': random.randint(100000000, 10000000000),  # Random size between 100MB and 10GB
            'username': 'SampleUser',
            'added': int(datetime.datetime.now().timestamp()) - random.randint(0, 30*24*60*60),  # Random time in the last 30 days
            'status': 'vip',
            'category': str(200 + random.randint(1, 12)),  # Random video category
            'imdb': '',
            'descr': 'This is a sample torrent description for demonstration purposes.',
            'provider': self.name
        }
        
        return details
