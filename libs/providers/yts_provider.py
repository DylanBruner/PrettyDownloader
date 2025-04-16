import requests
import json
import urllib.parse
import datetime
import random
from typing import List, Dict, Any, Optional

from libs.providers.base_provider import TorrentProvider

class YTSProvider(TorrentProvider):
    """YTS/YIFY torrent provider implementation"""

    def __init__(self):
        self.api_url = "https://yts.mx/api/v2"
        self._enabled = True  # Default to enabled

    @property
    def name(self) -> str:
        return "YTS/YIFY"

    @property
    def enabled(self) -> bool:
        return self._enabled

    @enabled.setter
    def enabled(self, value: bool):
        self._enabled = value

    def get_request(self, endpoint, params=None):
        """Make a GET request to the YTS API"""
        try:
            url = f"{self.api_url}/{endpoint}"
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            # YTS API returns status and data in the response
            if data.get('status') == 'ok':
                return data.get('data', {})
            else:
                print(f"[WARNING] YTS API returned error: {data.get('status_message')}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Error making request to YTS API: {e}")
            return None

    def get_trackers(self):
        """Return a string of trackers for magnet links"""
        trackers = [
            'udp://open.demonii.com:1337/announce',
            'udp://tracker.openbittorrent.com:80',
            'udp://tracker.coppersurfer.tk:6969',
            'udp://glotorrents.pw:6969/announce',
            'udp://tracker.opentrackr.org:1337/announce',
            'udp://torrent.gresille.org:80/announce',
            'udp://p4p.arenabg.com:1337',
            'udp://tracker.leechers-paradise.org:6969',
        ]

        return ''.join([f'&tr={urllib.parse.quote(tracker)}' for tracker in trackers])

    def create_magnet_link(self, info_hash: str, name: str) -> str:
        """Create a magnet link for a torrent"""
        trackers = self.get_trackers()
        return f"magnet:?xt=urn:btih:{info_hash}&dn={urllib.parse.quote(name)}{trackers}"

    def format_size(self, size_bytes):
        """Format size in bytes to a human-readable format"""
        if size_bytes >= 1073741824:  # GiB
            return f"{round(size_bytes / 1073741824, 2)} GiB"
        elif size_bytes >= 1048576:  # MiB
            return f"{round(size_bytes / 1048576, 2)} MiB"
        elif size_bytes >= 1024:  # KiB
            return f"{round(size_bytes / 1024, 2)} KiB"
        else:
            return f"{size_bytes} B"

    def parse_size(self, size_str):
        """Convert a size string (e.g., '1.5 GB') to bytes"""
        try:
            if not size_str:
                return 0

            size_str = size_str.upper()
            value, unit = size_str.split(' ')
            value = float(value)

            if 'KB' in unit:
                return int(value * 1024)
            elif 'MB' in unit:
                return int(value * 1024 * 1024)
            elif 'GB' in unit:
                return int(value * 1024 * 1024 * 1024)
            elif 'TB' in unit:
                return int(value * 1024 * 1024 * 1024 * 1024)
            else:
                return int(value)
        except Exception as e:
            print(f"[ERROR] Error parsing size string '{size_str}': {e}")
            return 0

    def search(self, query: str, category: int = 0) -> List[Dict[str, Any]]:
        """Search YTS for movies"""
        if not self.enabled:
            print("[INFO] YTS provider is disabled")
            return []

        print(f"[INFO] Searching YTS for: {query}")

        # YTS only has movies, so we ignore the category parameter
        params = {
            'query_term': query,
            'limit': 50,  # Get a good number of results
            'sort_by': 'seeds',  # Sort by seeders (most popular first)
        }

        data = self.get_request('list_movies.json', params)
        if not data:
            return []

        # Check if we have movie results
        movie_count = data.get('movie_count', 0)
        if movie_count == 0:
            return []

        movies = data.get('movies', [])
        results = []

        for movie in movies:
            movie_id = movie.get('id')
            title = movie.get('title', '')
            year = movie.get('year', '')
            rating = movie.get('rating', '')
            runtime = movie.get('runtime', '')
            genres = movie.get('genres', [])
            summary = movie.get('summary', '')
            language = movie.get('language', '')
            imdb_code = movie.get('imdb_code', '')

            # Process each torrent for this movie
            torrents = movie.get('torrents', [])
            for torrent in torrents:
                quality = torrent.get('quality', '')
                type = torrent.get('type', '')  # 3D, BluRay, etc.
                seeds = torrent.get('seeds', 0)
                peers = torrent.get('peers', 0)
                size = torrent.get('size', '')
                # Use size_bytes if available, otherwise parse the size string
                size_bytes = torrent.get('size_bytes', 0)
                if not size_bytes and size:
                    size_bytes = self.parse_size(size)
                date_uploaded = torrent.get('date_uploaded', '')
                hash = torrent.get('hash', '')

                # Create a standardized result format similar to TPB
                result = {
                    'id': f"{movie_id}_{quality}_{type}",
                    'name': f"{title} ({year}) [{quality}] [{type}] - YTS",
                    'info_hash': hash,
                    'seeders': seeds,
                    'leechers': peers,
                    'num_files': 1,  # YTS usually has single file torrents
                    'size': size_bytes,
                    'size_formatted': size,
                    'username': 'YTS',
                    'added': int(datetime.datetime.fromisoformat(date_uploaded.replace('Z', '+00:00')).timestamp()) if date_uploaded else 0,
                    'status': 'trusted',
                    'category': '201',  # Movies category (using TPB category system)
                    'imdb': imdb_code,
                    'provider': self.name,

                    # YTS specific fields
                    'movie_id': movie_id,
                    'title': title,
                    'year': year,
                    'rating': rating,
                    'runtime': runtime,
                    'genres': genres,
                    'summary': summary,
                    'language': language,
                    'quality': quality,
                    'type': type
                }

                results.append(result)

        return results

    def get_torrent_details(self, torrent_id: str) -> Optional[Dict[str, Any]]:
        """Get details for a specific torrent"""
        if not self.enabled:
            print("[INFO] YTS provider is disabled")
            return None

        # YTS torrent IDs are in the format "movie_id_quality_type"
        # We need to extract the movie_id to get the details
        try:
            parts = torrent_id.split('_')
            movie_id = parts[0]
            quality = parts[1] if len(parts) > 1 else None
            type = parts[2] if len(parts) > 2 else None

            params = {'movie_id': movie_id}
            data = self.get_request('movie_details.json', params)

            if not data or 'movie' not in data:
                return None

            movie = data.get('movie', {})

            # Find the specific torrent
            torrents = movie.get('torrents', [])
            target_torrent = None

            for torrent in torrents:
                if quality and torrent.get('quality') != quality:
                    continue
                if type and torrent.get('type') != type:
                    continue

                target_torrent = torrent
                break

            if not target_torrent:
                # If we can't find the exact torrent, just return the first one
                target_torrent = torrents[0] if torrents else None

            if not target_torrent:
                return None

            # Create a standardized result format
            result = {
                'id': torrent_id,
                'name': f"{movie.get('title')} ({movie.get('year')}) [{target_torrent.get('quality')}] [{target_torrent.get('type')}] - YTS",
                'info_hash': target_torrent.get('hash', ''),
                'seeders': target_torrent.get('seeds', 0),
                'leechers': target_torrent.get('peers', 0),
                'num_files': 1,  # YTS usually has single file torrents
                'size_formatted': target_torrent.get('size', ''),
                # Use size_bytes if available, otherwise parse the size string
                'size': target_torrent.get('size_bytes', 0) or self.parse_size(target_torrent.get('size', '')),
                'username': 'YTS',
                'added': int(datetime.datetime.fromisoformat(target_torrent.get('date_uploaded', '').replace('Z', '+00:00')).timestamp()) if target_torrent.get('date_uploaded') else 0,
                'status': 'trusted',
                'category': '201',  # Movies category (using TPB category system)
                'imdb': movie.get('imdb_code', ''),
                'provider': self.name,
                'descr': movie.get('description_full', ''),

                # YTS specific fields
                'movie_id': movie.get('id'),
                'title': movie.get('title'),
                'year': movie.get('year'),
                'rating': movie.get('rating'),
                'runtime': movie.get('runtime'),
                'genres': movie.get('genres', []),
                'summary': movie.get('summary', ''),
                'language': movie.get('language'),
                'quality': target_torrent.get('quality'),
                'type': target_torrent.get('type'),
                'large_cover_image': movie.get('large_cover_image'),
                'medium_cover_image': movie.get('medium_cover_image'),
                'small_cover_image': movie.get('small_cover_image'),
                'background_image': movie.get('background_image'),
                'background_image_original': movie.get('background_image_original'),
            }

            return result

        except Exception as e:
            print(f"[ERROR] Error getting YTS torrent details: {e}")
            return None
