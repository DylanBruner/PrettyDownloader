#!/usr/bin/env python3
"""
Test script for the torrent provider system
"""

import os
import json
from dotenv import load_dotenv
from libs.providers.provider_manager import ProviderManager
from libs.providers.piratebay_provider import PirateBayProvider
from libs.providers.sample_provider import SampleProvider

def main():
    # Load environment variables
    load_dotenv()
    
    print("Testing torrent provider system...")
    
    # Initialize provider manager
    provider_manager = ProviderManager()
    
    # Register providers
    piratebay_provider = PirateBayProvider()
    provider_manager.register_provider("piratebay", piratebay_provider)
    
    sample_provider = SampleProvider()
    sample_provider.enabled = True  # Enable the sample provider for testing
    provider_manager.register_provider("sample", sample_provider)
    
    # List all providers
    print("\nRegistered providers:")
    for provider_id, provider in provider_manager.get_all_providers().items():
        print(f"  - {provider_id}: {provider.name} (enabled: {provider.enabled})")
    
    # Test search with PirateBay provider
    print("\nSearching with PirateBay provider...")
    piratebay_results = provider_manager.search("ubuntu", provider_id="piratebay")
    print(f"Found {len(piratebay_results)} results")
    if piratebay_results:
        print(f"First result: {json.dumps(piratebay_results[0], indent=2)}")
    
    # Test search with Sample provider
    print("\nSearching with Sample provider...")
    sample_results = provider_manager.search("ubuntu", provider_id="sample")
    print(f"Found {len(sample_results)} results")
    if sample_results:
        print(f"First result: {json.dumps(sample_results[0], indent=2)}")
    
    # Test search across all providers
    print("\nSearching across all providers...")
    all_results = provider_manager.search("ubuntu")
    print(f"Found {len(all_results)} results")
    
    # Count results by provider
    provider_counts = {}
    for result in all_results:
        provider = result.get("provider", "unknown")
        provider_counts[provider] = provider_counts.get(provider, 0) + 1
    
    print("Results by provider:")
    for provider, count in provider_counts.items():
        print(f"  - {provider}: {count} results")
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    main()
