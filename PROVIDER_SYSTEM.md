# PrettyDownloader Provider System Documentation

PrettyDownloader uses a modular provider system that allows for easy integration of different torrent sources. This document explains how the provider system works and how to create new providers.

## Table of Contents

1. [Overview](#overview)
2. [Provider Architecture](#provider-architecture)
3. [Provider Manager](#provider-manager)
4. [Creating a New Provider](#creating-a-new-provider)
5. [Provider Settings](#provider-settings)
6. [API Endpoints](#api-endpoints)
7. [UI Integration](#ui-integration)
8. [Best Practices](#best-practices)

## Overview

The provider system in PrettyDownloader is designed to be modular and extensible, allowing the application to search for torrents across multiple sources. Each provider is implemented as a separate class that follows a common interface, making it easy to add new providers without modifying the core application code.

Key features of the provider system:

- Abstract base class defining the provider interface
- Provider manager for registering and managing providers
- Ability to enable/disable providers through the UI
- Persistent provider settings
- Standardized search result format
- Filtering and sorting of combined results

## Provider Architecture

### Base Provider Class

All providers must inherit from the `TorrentProvider` abstract base class, which defines the required interface:

```python
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
            torrent_id (str): Torrent ID

        Returns:
            Optional[Dict[str, Any]]: Torrent details or None if not found
        """
        pass
```

### Standard Result Format

To ensure consistency across different providers, all search results should follow this standard format:

```python
{
    'id': str,                  # Unique identifier for the torrent within the provider
    'name': str,                # Name of the torrent
    'info_hash': str,           # Torrent info hash
    'seeders': int,             # Number of seeders
    'leechers': int,            # Number of leechers
    'num_files': int,           # Number of files in the torrent
    'size': int,                # Size in bytes
    'size_formatted': str,      # Human-readable size (optional)
    'username': str,            # Uploader username
    'added': int,               # Timestamp when the torrent was added
    'status': str,              # Status of the torrent (e.g., 'trusted', 'vip')
    'category': str,            # Category ID
    'imdb': str,                # IMDB ID (optional)
    'provider': str             # Provider name
}
```

## Provider Manager

The `ProviderManager` class is responsible for managing all registered providers and coordinating searches across them:

```python
class ProviderManager:
    """Manager for torrent providers"""

    def __init__(self):
        self.providers = {}  # Dictionary of provider_id -> provider instance

    def register_provider(self, provider_id: str, provider: TorrentProvider) -> None:
        """Register a provider with the manager"""
        self.providers[provider_id] = provider
        print(f"[INFO] Registered provider: {provider.name} with ID {provider_id}")

    def get_provider(self, provider_id: str) -> Optional[TorrentProvider]:
        """Get a provider by ID"""
        return self.providers.get(provider_id)

    def get_all_providers(self) -> Dict[str, TorrentProvider]:
        """Get all registered providers"""
        return self.providers

    def get_enabled_providers(self) -> Dict[str, TorrentProvider]:
        """Get all enabled providers"""
        return {pid: provider for pid, provider in self.providers.items() if provider.enabled}

    def search(self, query: str, category: int = 0, provider_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search for torrents across all enabled providers or a specific provider"""
        # Implementation details...
```

Key features of the Provider Manager:

- Register new providers with unique IDs
- Get a specific provider by ID
- Get all registered providers
- Get only enabled providers
- Search across all enabled providers or a specific provider
- Filter adult content based on settings
- Sort combined results by seeders and leechers

## Creating a New Provider

To create a new provider, follow these steps:

1. Create a new Python file in the `libs/providers/` directory
2. Import the base provider class: `from libs.providers.base_provider import TorrentProvider`
3. Create a new class that inherits from `TorrentProvider`
4. Implement all required methods and properties
5. Register the provider in `server.py`

### Example Provider Implementation

Here's a simplified example of a provider implementation:

```python
import requests
from typing import List, Dict, Any, Optional
from libs.providers.base_provider import TorrentProvider

class ExampleProvider(TorrentProvider):
    """Example torrent provider implementation"""

    def __init__(self):
        self.api_url = "https://example-torrent-site.com/api"
        self._enabled = True  # Default to enabled

    @property
    def name(self) -> str:
        return "Example Provider"

    @property
    def enabled(self) -> bool:
        return self._enabled

    @enabled.setter
    def enabled(self, value: bool):
        self._enabled = value

    def search(self, query: str, category: int = 0) -> List[Dict[str, Any]]:
        """Search for torrents"""
        if not self.enabled:
            print("[INFO] Example provider is disabled")
            return []

        try:
            # Make API request to the torrent site
            response = requests.get(f"{self.api_url}/search", params={"q": query, "cat": category})
            response.raise_for_status()
            data = response.json()

            # Transform the results to the standard format
            results = []
            for item in data.get("results", []):
                result = {
                    "id": item["id"],
                    "name": item["title"],
                    "info_hash": item["hash"],
                    "seeders": int(item["seeders"]),
                    "leechers": int(item["leechers"]),
                    "num_files": int(item.get("files", 1)),
                    "size": int(item["size"]),
                    "size_formatted": item.get("size_formatted", ""),
                    "username": item.get("uploader", "Unknown"),
                    "added": int(item["added"]),
                    "status": item.get("status", ""),
                    "category": str(item.get("category", "")),
                    "imdb": item.get("imdb", ""),
                    "provider": self.name
                }
                results.append(result)

            return results
        except Exception as e:
            print(f"[ERROR] Error searching Example provider: {e}")
            return []

    def get_torrent_details(self, torrent_id: str) -> Optional[Dict[str, Any]]:
        """Get details for a specific torrent"""
        if not self.enabled:
            return None

        try:
            # Make API request to get torrent details
            response = requests.get(f"{self.api_url}/torrent/{torrent_id}")
            response.raise_for_status()
            item = response.json()

            # Transform to standard format
            result = {
                "id": item["id"],
                "name": item["title"],
                "info_hash": item["hash"],
                # ... other fields ...
            }
            return result
        except Exception as e:
            print(f"[ERROR] Error getting torrent details from Example provider: {e}")
            return None
```

### Registering a New Provider

After creating your provider class, register it in `server.py`:

```python
# Initialize provider manager
provider_manager = ProviderManager()

# Register existing providers
piratebay_provider = PirateBayProvider()
provider_manager.register_provider("piratebay", piratebay_provider)

# Register your new provider
example_provider = ExampleProvider()
provider_manager.register_provider("example", example_provider)
```

## Provider Settings

Provider settings are stored in the application's settings database and can be configured through the Server Settings page in the web UI. The settings are loaded when the application starts and applied to the registered providers.

### Settings Storage

Provider settings are stored in the `settings.json` file under the `providers` key:

```json
{
  "settings": {
    "providers": {
      "piratebay": {
        "enabled": true
      },
      "yts": {
        "enabled": true
      },
      "example": {
        "enabled": false
      }
    }
  }
}
```

### Loading Provider Settings

When the application starts, it loads the provider settings from the settings database and applies them to the registered providers:

```python
# Load provider settings from settings database
try:
    provider_settings = settings.get_effective_settings().get("providers", {})
    print(f"[INFO] Loaded provider settings: {provider_settings}")

    # Apply settings to providers
    for provider_id, provider_config in provider_settings.items():
        provider = provider_manager.get_provider(provider_id)
        if provider:
            if "enabled" in provider_config:
                provider.enabled = provider_config["enabled"]
                print(f"[INFO] Set provider {provider_id} enabled status to {provider.enabled}")
        else:
            print(f"[WARNING] Provider {provider_id} not found but has settings")
except Exception as e:
    print(f"[ERROR] Failed to load provider settings: {e}")
```

## API Endpoints

PrettyDownloader provides several API endpoints for interacting with providers:

### Get All Providers

```
GET /api/providers
```

Returns a list of all registered providers with their ID, name, and enabled status.

### Toggle Provider Status

```
POST /api/providers/{provider_id}/toggle
```

Toggles the enabled status of a specific provider and saves the setting to the database.

### Search Torrents

```
GET /api/torrents?q={query}&category={category}&provider_id={provider_id}
```

Searches for torrents matching the query. If `provider_id` is specified, only searches that provider; otherwise, searches all enabled providers.

## UI Integration

The provider system is integrated into the PrettyDownloader UI through the Server Settings page, which allows administrators to enable or disable providers.

### Provider Management UI

The Server Settings page includes a section for managing torrent providers:

```html
<div class="mb-6">
  <h3 class="text-lg font-semibold mb-4 border-b border-gray-700 pb-2">Torrent Providers</h3>
  <p class="text-sm text-gray-400 mb-4">
    Enable or disable torrent providers used for searching.
  </p>

  <div id="providers-container" class="grid grid-cols-1 gap-4">
    <!-- Providers will be dynamically inserted here -->
  </div>
</div>
```

JavaScript functions fetch the list of providers and display them with toggle switches:

```javascript
// Fetch providers
async function fetchProviders() {
  try {
    const response = await fetch('/api/providers');
    const data = await response.json();

    if (data.success) {
      displayProviders(data.providers);
    } else {
      showToast(data.message || 'Failed to fetch providers', 'error');
    }
  } catch (error) {
    console.error('Error fetching providers:', error);
    showToast('Error fetching providers', 'error');
  }
}

// Display providers
function displayProviders(providers) {
  const providersContainer = document.getElementById('providers-container');

  if (providersContainer) {
    // Clear loading indicator
    providersContainer.innerHTML = '';

    if (providers.length === 0) {
      providersContainer.innerHTML = '<p class="text-center py-4 text-gray-400">No providers available</p>';
      return;
    }

    // Create a card for each provider
    providers.forEach(provider => {
      const providerCard = document.createElement('div');
      providerCard.className = 'card p-4 flex justify-between items-center';
      providerCard.innerHTML = `
        <div>
          <h4 class="font-semibold">${provider.name}</h4>
          <p class="text-xs text-gray-400">Provider ID: ${provider.id}</p>
        </div>
        <div>
          <label class="switch">
            <input type="checkbox" id="provider-${provider.id}" ${provider.enabled ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>
      `;

      providersContainer.appendChild(providerCard);

      // Add event listener to toggle switch
      const toggleSwitch = document.getElementById(`provider-${provider.id}`);
      if (toggleSwitch) {
        toggleSwitch.addEventListener('change', () => toggleProvider(provider.id, toggleSwitch.checked));
      }
    });
  }
}
```

## Best Practices

When implementing a new provider for PrettyDownloader, follow these best practices to ensure compatibility and optimal performance:

### Standardized Result Format

Always ensure your search results follow the standard format described in the [Standard Result Format](#standard-result-format) section. This ensures consistent display and filtering in the UI.

### Error Handling

Implement robust error handling in your provider. Catch and log exceptions, and return empty results rather than letting exceptions propagate up the call stack.

```python
try:
    # API calls and result processing
    return results
except Exception as e:
    print(f"[ERROR] Error in provider {self.name}: {e}")
    return []
```

### Respect Enabled Status

Always check the `enabled` property at the beginning of your methods and return early if the provider is disabled:

```python
def search(self, query: str, category: int = 0):
    if not self.enabled:
        print(f"[INFO] {self.name} provider is disabled")
        return []

    # Continue with search implementation
```

### Consistent Logging

Use consistent logging patterns to make debugging easier:

```python
print(f"[INFO] {self.name} searching for: {query}")
print(f"[WARNING] {self.name} received invalid response")
print(f"[ERROR] {self.name} encountered an error: {e}")
```

### Rate Limiting

Implement rate limiting if the torrent site's API requires it:

```python
def __init__(self):
    self.api_url = "https://example-torrent-site.com/api"
    self._enabled = True
    self.last_request_time = 0
    self.min_request_interval = 1.0  # seconds

def _rate_limit(self):
    """Ensure requests are not sent too frequently"""
    current_time = time.time()
    time_since_last = current_time - self.last_request_time

    if time_since_last < self.min_request_interval:
        sleep_time = self.min_request_interval - time_since_last
        time.sleep(sleep_time)

    self.last_request_time = time.time()
```

### Caching

Consider implementing caching for frequently used results:

```python
def __init__(self):
    self.api_url = "https://example-torrent-site.com/api"
    self._enabled = True
    self.cache = {}
    self.cache_expiry = 300  # 5 minutes

def search(self, query: str, category: int = 0):
    if not self.enabled:
        return []

    # Check cache
    cache_key = f"{query}:{category}"
    if cache_key in self.cache:
        cache_entry = self.cache[cache_key]
        if time.time() - cache_entry['timestamp'] < self.cache_expiry:
            print(f"[INFO] {self.name} returning cached results for {query}")
            return cache_entry['results']

    # Perform search
    results = self._perform_search(query, category)

    # Update cache
    self.cache[cache_key] = {
        'timestamp': time.time(),
        'results': results
    }

    return results
```

### Testing

Test your provider thoroughly before integrating it:

1. Test with various search queries
2. Test with empty results
3. Test with network errors
4. Test with malformed API responses

## Conclusion

The provider plugin system in PrettyDownloader offers a flexible and extensible way to integrate multiple torrent sources into the application. By following the guidelines in this document, you can create new providers that seamlessly integrate with the existing system, enhancing the search capabilities of PrettyDownloader.