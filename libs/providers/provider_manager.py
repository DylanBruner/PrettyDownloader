from typing import List, Dict, Any, Optional, Type
import os

from libs.providers.base_provider import TorrentProvider

class ProviderManager:
    """Manager for torrent providers"""

    def __init__(self):
        self.providers = {}  # Dictionary of provider_id -> provider instance

    def register_provider(self, provider_id: str, provider: TorrentProvider) -> None:
        """
        Register a provider with the manager

        Args:
            provider_id (str): Unique identifier for the provider
            provider (TorrentProvider): Provider instance
        """
        self.providers[provider_id] = provider
        print(f"[INFO] Registered provider: {provider.name} with ID {provider_id}")

    def get_provider(self, provider_id: str) -> Optional[TorrentProvider]:
        """
        Get a provider by ID

        Args:
            provider_id (str): Provider ID

        Returns:
            Optional[TorrentProvider]: Provider instance or None if not found
        """
        return self.providers.get(provider_id)

    def get_all_providers(self) -> Dict[str, TorrentProvider]:
        """
        Get all registered providers

        Returns:
            Dict[str, TorrentProvider]: Dictionary of provider_id -> provider
        """
        return self.providers

    def get_enabled_providers(self) -> Dict[str, TorrentProvider]:
        """
        Get all enabled providers

        Returns:
            Dict[str, TorrentProvider]: Dictionary of provider_id -> provider for enabled providers
        """
        return {pid: provider for pid, provider in self.providers.items() if provider.enabled}

    def search(self, query: str, category: int = 0, provider_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Search for torrents across all enabled providers or a specific provider

        Args:
            query (str): Search query
            category (int, optional): Category ID. Defaults to 0.
            provider_id (Optional[str], optional): Specific provider ID to search. Defaults to None.

        Returns:
            List[Dict[str, Any]]: Combined search results from all providers
        """
        results = []

        # If a specific provider is requested
        if provider_id:
            provider = self.get_provider(provider_id)
            if provider and provider.enabled:
                print(f"[INFO] Searching with provider: {provider.name}")
                provider_results = provider.search(query, category)
                results.extend(provider_results)
            else:
                print(f"[WARNING] Provider {provider_id} not found or disabled")
        else:
            # Search across all enabled providers
            for pid, provider in self.get_enabled_providers().items():
                print(f"[INFO] Searching with provider: {provider.name}")
                provider_results = provider.search(query, category)
                results.extend(provider_results)

        # Filter out adult content if the setting is enabled
        hide_adult = os.environ.get('hide-adult-content', 'true').lower() == 'true'
        if hide_adult:
            # Filter out results with XXX in the name or in adult categories (500-599)
            original_count = len(results)
            results = [
                result for result in results
                if 'XXX' not in result['name'].upper() and
                   not (result.get('category') and 500 <= int(result['category']) < 600)
            ]
            filtered_count = original_count - len(results)
            if filtered_count > 0:
                print(f"[INFO] Filtered out {filtered_count} adult content results")

        # Sort the combined results by seeders (descending) and then by leechers (descending)
        if results:
            print(f"[INFO] Sorting {len(results)} combined results from all providers")
            results.sort(key=lambda x: (int(x.get('seeders', 0)), int(x.get('leechers', 0))), reverse=True)

        return results

    def get_torrent_details(self, torrent_id: str, provider_id: str) -> Optional[Dict[str, Any]]:
        """
        Get details for a specific torrent from a specific provider

        Args:
            torrent_id (str): Torrent ID
            provider_id (str): Provider ID

        Returns:
            Optional[Dict[str, Any]]: Torrent details or None if not found
        """
        provider = self.get_provider(provider_id)
        if provider and provider.enabled:
            return provider.get_torrent_details(torrent_id)
        return None

    def create_magnet_link(self, info_hash: str, name: str, provider_id: str) -> Optional[str]:
        """
        Create a magnet link for a torrent using a specific provider

        Args:
            info_hash (str): Info hash
            name (str): Torrent name
            provider_id (str): Provider ID

        Returns:
            Optional[str]: Magnet link or None if provider not found
        """
        provider = self.get_provider(provider_id)
        if provider and provider.enabled:
            return provider.create_magnet_link(info_hash, name)
        return None
