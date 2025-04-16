import requests
import json
import urllib.parse
import datetime
import os
from typing import List, Dict, Any, Optional

from libs.providers.base_provider import TorrentProvider

class PirateBayProvider(TorrentProvider):
    """PirateBay torrent provider implementation"""
    
    def __init__(self):
        self.server = "https://apibay.org"
        self.static_server = "https://torrindex.net"
        self._enabled = True  # Default to enabled
    
    @property
    def name(self) -> str:
        return "The Pirate Bay"
    
    @property
    def enabled(self) -> bool:
        return self._enabled
    
    @enabled.setter
    def enabled(self, value: bool):
        self._enabled = value
    
    def get_request(self, endpoint):
        """Make a GET request to the API"""
        try:
            response = requests.get(f"{self.server}/{endpoint}")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error making request to PirateBay: {e}")
            return None
    
    def get_trackers(self):
        """Return a string of trackers for magnet links"""
        trackers = [
            'udp://tracker.opentrackr.org:1337',
            'udp://open.stealth.si:80/announce',
            'udp://tracker.torrent.eu.org:451/announce',
            'udp://tracker.bittor.pw:1337/announce',
            'udp://public.popcorn-tracker.org:6969/announce',
            'udp://tracker.dler.org:6969/announce',
            'udp://exodus.desync.com:6969',
            'udp://open.demonii.com:1337/announce',
        ]
        
        return ''.join([f'&tr={urllib.parse.quote(tracker)}' for tracker in trackers])
    
    def create_magnet_link(self, info_hash: str, name: str) -> str:
        """Create a magnet link for a torrent"""
        trackers = self.get_trackers()
        return f"magnet:?xt=urn:btih:{info_hash}&dn={urllib.parse.quote(name)}{trackers}"
    
    def get_category_name(self, category):
        """Return the name of a category based on its ID"""
        categories = {
            101: "Music", 102: "Audio Books", 103: "Sound clips", 104: "FLAC", 199: "Other",
            201: "Movies", 202: "Movies DVDR", 203: "Music videos", 204: "Movie Clips",
            205: "TV-Shows", 206: "Handheld", 207: "HD Movies", 208: "HD TV-Shows",
            209: "3D", 210: "CAM/TS", 211: "UHD/4k Movies", 212: "UHD/4k TV-Shows", 299: "Other",
            301: "Windows", 302: "Mac/Apple", 303: "UNIX", 304: "Handheld",
            305: "IOS(iPad/iPhone)", 306: "Android", 399: "Other OS",
            401: "PC", 402: "Mac/Apple", 403: "PSx", 404: "XBOX360",
            405: "Wii", 406: "Handheld", 407: "IOS(iPad/iPhone)", 408: "Android", 499: "Other",
            501: "Movies", 502: "Movies DVDR", 503: "Pictures", 504: "Games",
            505: "HD Movies", 506: "Movie Clips", 507: "UHD/4k Movies", 599: "Other",
            601: "E-books", 602: "Comics", 603: "Pictures", 604: "Covers", 605: "Physibles", 699: "Other"
        }
        
        if category in categories:
            return categories[category]
        
        # Get main category
        main_cat = int(str(category)[0]) * 100
        if main_cat == 100:
            return "Audio"
        elif main_cat == 200:
            return "Video"
        elif main_cat == 300:
            return "Applications"
        elif main_cat == 400:
            return "Games"
        elif main_cat == 500:
            return "Porn"
        elif main_cat == 600:
            return "Other"
        
        return "Unknown"
    
    def format_size(self, size):
        """Format size in bytes to a human-readable format"""
        if size >= 1125899906842624:  # PiB
            return f"{round(size / 1125899906842624, 2)} PiB"
        elif size >= 1099511627776:  # TiB
            return f"{round(size / 1099511627776, 2)} TiB"
        elif size >= 1073741824:  # GiB
            return f"{round(size / 1073741824, 2)} GiB"
        elif size >= 1048576:  # MiB
            return f"{round(size / 1048576, 2)} MiB"
        elif size >= 1024:  # KiB
            return f"{round(size / 1024, 2)} KiB"
        else:
            return f"{size} B"
    
    def format_date(self, timestamp):
        """Format a Unix timestamp to a readable date"""
        date = datetime.datetime.fromtimestamp(timestamp)
        return date.strftime("%Y-%m-%d %H:%M")
    
    def search(self, query: str, category: int = 0) -> List[Dict[str, Any]]:
        """Search TPB for torrents"""
        if not self.enabled:
            print("[INFO] PirateBay provider is disabled")
            return []
            
        if query.startswith('top100:'):
            # Handle top100 searches
            top_type = query.split(':')[1]
            endpoint = f"precompiled/data_top100_{top_type}.json"
        else:
            # Handle regular searches
            endpoint = f"q.php?q={urllib.parse.quote(query)}"
            if category:
                endpoint += f"&cat={category}"
        
        results = self.get_request(endpoint)
        if not results:
            return []
            
        # Add provider info to each result
        for result in results:
            result['provider'] = self.name
            
        return results
    
    def get_torrent_details(self, torrent_id: str) -> Optional[Dict[str, Any]]:
        """Get details for a specific torrent"""
        if not self.enabled:
            print("[INFO] PirateBay provider is disabled")
            return None
            
        endpoint = f"t.php?id={torrent_id}"
        details = self.get_request(endpoint)
        
        if details:
            details['provider'] = self.name
            
        return details
    
    def get_torrent_files(self, torrent_id: str) -> List[Dict[str, Any]]:
        """Get files for a specific torrent"""
        if not self.enabled:
            print("[INFO] PirateBay provider is disabled")
            return []
            
        endpoint = f"f.php?id={torrent_id}"
        return self.get_request(endpoint)
    
    def print_torrent(self, torrent):
        """Print a single torrent in a formatted way"""
        magnet = self.create_magnet_link(torrent['info_hash'], torrent['name'])
        
        print(f"\033[1m{torrent['name']}\033[0m")
        print(f"Category: {self.get_category_name(int(torrent['category']))}")
        print(f"Size: {self.format_size(int(torrent['size']))}")
        print(f"Uploaded: {self.format_date(int(torrent['added']))}")
        print(f"Seeders: {torrent['seeders']} | Leechers: {torrent['leechers']}")
        print(f"Uploader: {torrent['username']}")
        print(f"Magnet: {magnet}")
        print("-" * 80)
    
    def print_search_results(self, results, limit=10):
        """Print the search results in a formatted way"""
        if not results or results[0].get('name') == 'No results returned':
            print("No results found.")
            return
        
        count = 0
        for torrent in results:
            if count >= limit:
                break
                
            self.print_torrent(torrent)
            count += 1
        
        print(f"Showing {count} of {len(results)} results")
    
    def print_torrent_details(self, torrent_id):
        """Print detailed information about a torrent"""
        details = self.get_torrent_details(torrent_id)
        if not details:
            print("Torrent not found.")
            return
        
        print(f"\033[1m{details['name']}\033[0m")
        print(f"Category: {self.get_category_name(int(details['category']))}")
        print(f"Size: {self.format_size(int(details['size']))}")
        print(f"Uploaded: {self.format_date(int(details['added']))}")
        print(f"Seeders: {details['seeders']} | Leechers: {details['leechers']}")
        print(f"Uploader: {details['username']}")
        print(f"Info Hash: {details['info_hash']}")
        
        if details.get('descr'):
            print("\nDescription:")
            print(details['descr'])
        
        if details.get('imdb'):
            print(f"\nIMDb: https://www.imdb.com/title/{details['imdb']}")
        
        magnet = self.create_magnet_link(details['info_hash'], details['name'])
        print(f"\nMagnet Link:\n{magnet}")
        
        # Get files
        files = self.get_torrent_files(torrent_id)
        if files:
            print("\nFiles:")
            for i, file in enumerate(files):
                print(f"{i+1}. {file['name'][0]} ({self.format_size(int(file['size'][0]))})")
