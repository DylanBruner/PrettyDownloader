/**
 * Direct Search functionality
 * This script handles the direct search page which skips TMDB and searches TPB directly
 */

// Global variables
let allDirectResults = [];
let filteredDirectResults = [];
let directSearchFilters = {
  contentType: 'all',
  episodeType: 'all',
  year: '',
  quality: '',
  provider: '',
  liveSearch: ''
};

// Initialize direct search page
document.addEventListener('DOMContentLoaded', function() {
  initDirectSearch();

  // Add keyboard shortcut for live search (Ctrl+F or Cmd+F)
  document.addEventListener('keydown', function(e) {
    // Check if Ctrl+F or Cmd+F is pressed
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      const liveSearchInput = document.getElementById('live-search-input');
      const liveSearchContainer = document.getElementById('live-search-container');

      // Only if the live search is visible and we're on the direct search page
      if (liveSearchInput && liveSearchContainer && !liveSearchContainer.classList.contains('hidden')) {
        e.preventDefault(); // Prevent browser's default search
        liveSearchInput.focus();
      }
    }
  });
});

// Initialize direct search functionality
function initDirectSearch() {
  const directSearchForm = document.getElementById('direct-search-form');
  const directSearchResults = document.getElementById('direct-search-results');
  const liveSearchContainer = document.getElementById('live-search-container');
  const liveSearchInput = document.getElementById('live-search-input');
  const clearLiveSearchBtn = document.getElementById('clear-live-search');

  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('q');

  if (directSearchForm && directSearchResults) {
    // Set up event listeners for filters
    const contentTypeFilter = document.getElementById('content-type-filter');
    const episodeTypeFilter = document.getElementById('episode-type-filter');
    const yearFilter = document.getElementById('year-filter');
    const qualityFilter = document.getElementById('quality-filter');
    const providerFilter = document.getElementById('provider-filter');

    if (contentTypeFilter) {
      contentTypeFilter.addEventListener('change', function() {
        directSearchFilters.contentType = this.value;
        if (allDirectResults.length > 0) {
          displayDirectSearchResults(allDirectResults);
        }
      });
    }

    if (episodeTypeFilter) {
      episodeTypeFilter.addEventListener('change', function() {
        directSearchFilters.episodeType = this.value;
        if (allDirectResults.length > 0) {
          displayDirectSearchResults(allDirectResults);
        }
      });
    }

    if (yearFilter) {
      yearFilter.addEventListener('change', function() {
        directSearchFilters.year = this.value ? parseInt(this.value) : '';
        if (allDirectResults.length > 0) {
          displayDirectSearchResults(allDirectResults);
        }
      });
    }

    if (qualityFilter) {
      qualityFilter.addEventListener('change', function() {
        directSearchFilters.quality = this.value;
        if (allDirectResults.length > 0) {
          displayDirectSearchResults(allDirectResults);
        }
      });
    }

    if (providerFilter) {
      providerFilter.addEventListener('change', function() {
        directSearchFilters.provider = this.value;
        if (allDirectResults.length > 0) {
          displayDirectSearchResults(allDirectResults);
        }
      });
    }

    // Set up live search functionality
    if (liveSearchInput && clearLiveSearchBtn) {
      // Add event listener for live search input
      liveSearchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim().toLowerCase();
        directSearchFilters.liveSearch = searchTerm;

        // Show/hide clear button based on input
        if (searchTerm.length > 0) {
          clearLiveSearchBtn.classList.remove('hidden');
        } else {
          clearLiveSearchBtn.classList.add('hidden');
        }

        // Filter results based on search term
        if (filteredDirectResults.length > 0) {
          displayDirectSearchResults(allDirectResults, true);
        }
      });

      // Add event listener for clear button
      clearLiveSearchBtn.addEventListener('click', function() {
        liveSearchInput.value = '';
        directSearchFilters.liveSearch = '';
        this.classList.add('hidden');

        // Re-display results without live search filter
        if (filteredDirectResults.length > 0) {
          displayDirectSearchResults(allDirectResults, true);
        }
      });
    }

    // Set up search form submission
    directSearchForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const query = document.getElementById('direct-search-input').value.trim();

      if (query) {
        // Reset live search filter
        if (liveSearchInput) {
          liveSearchInput.value = '';
          directSearchFilters.liveSearch = '';
          if (clearLiveSearchBtn) {
            clearLiveSearchBtn.classList.add('hidden');
          }
        }

        // Show loading state
        directSearchResults.innerHTML = '<div class="flex justify-center p-8"><div class="loader"></div></div>';

        try {
          // Search TPB directly
          const response = await fetch(`/api/torrents?q=${encodeURIComponent(query)}`);
          const data = await response.json();

          // Store all results globally
          allDirectResults = data;

          // Show live search container if we have results
          if (data && data.length > 0 && liveSearchContainer) {
            liveSearchContainer.classList.remove('hidden');
          }

          // Display search results
          displayDirectSearchResults(data);
        } catch (error) {
          console.error('Error searching:', error);
          directSearchResults.innerHTML = '<div class="text-center p-8 text-red-500">Error searching. Please try again.</div>';

          // Hide live search container on error
          if (liveSearchContainer) {
            liveSearchContainer.classList.add('hidden');
          }
        }
      }
    });
  }

  // If search query parameter exists, fill the search input and perform search directly
  if (searchQuery && directSearchForm) {
    const searchInput = document.getElementById('direct-search-input');
    if (searchInput) {
      // Set the input value
      searchInput.value = searchQuery;

      // Show loading state
      if (directSearchResults) {
        directSearchResults.innerHTML = '<div class="flex justify-center p-8"><div class="loader"></div></div>';
      }

      // Reset live search filter
      if (liveSearchInput) {
        liveSearchInput.value = '';
        directSearchFilters.liveSearch = '';
        if (clearLiveSearchBtn) {
          clearLiveSearchBtn.classList.add('hidden');
        }
      }

      // Directly make the API call instead of triggering form submission
      (async () => {
        try {
          // Search TPB directly
          const response = await fetch(`/api/torrents?q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();

          // Store all results globally
          allDirectResults = data;

          // Show live search container if we have results
          if (data && data.length > 0 && liveSearchContainer) {
            liveSearchContainer.classList.remove('hidden');
          }

          // Display search results
          displayDirectSearchResults(data);
        } catch (error) {
          console.error('Error searching:', error);
          if (directSearchResults) {
            directSearchResults.innerHTML = '<div class="text-center p-8 text-red-500">Error searching. Please try again.</div>';
          }

          // Hide live search container on error
          if (liveSearchContainer) {
            liveSearchContainer.classList.add('hidden');
          }
        }
      })();
    }
  }
}

// Display direct search results with filtering
function displayDirectSearchResults(results, skipFilterUpdate = false) {
  const directSearchResults = document.getElementById('direct-search-results');
  const liveSearchContainer = document.getElementById('live-search-container');

  if (!results || results.length === 0) {
    directSearchResults.innerHTML = '<div class="text-center p-8">No results found</div>';

    // Hide live search container if no results
    if (liveSearchContainer) {
      liveSearchContainer.classList.add('hidden');
    }

    return;
  }

  // Extract all available years, qualities, and providers for filter options
  const years = new Set();
  const qualities = new Set();
  const providers = new Set();

  // Apply main filters first
  let filteredResults = results.filter(result => {
    const metadata = extractMetadata(result.name);

    // Add to filter options
    if (metadata.year) years.add(metadata.year);
    if (metadata.quality) qualities.add(metadata.quality);
    if (result.provider) providers.add(result.provider);

    // Apply content type filter
    if (directSearchFilters.contentType !== 'all') {
      if (directSearchFilters.contentType === 'movie' && metadata.contentType !== 'movie') return false;
      if (directSearchFilters.contentType === 'tvshow' && metadata.contentType !== 'tvshow') return false;
    }

    // Apply episode type filter
    if (directSearchFilters.episodeType !== 'all') {
      if (directSearchFilters.episodeType === 'complete' && !metadata.complete) return false;
      if (directSearchFilters.episodeType === 'single' && metadata.complete) return false;
    }

    // Apply year filter
    if (directSearchFilters.year && metadata.year !== directSearchFilters.year) return false;

    // Apply quality filter
    if (directSearchFilters.quality && metadata.quality !== directSearchFilters.quality) return false;

    // Apply provider filter
    if (directSearchFilters.provider && result.provider !== directSearchFilters.provider) return false;

    return true;
  });

  // Store the filtered results before applying live search
  filteredDirectResults = [...filteredResults];

  // Apply live search filter if present
  if (directSearchFilters.liveSearch) {
    const searchTerm = directSearchFilters.liveSearch.toLowerCase();
    filteredResults = filteredResults.filter(result => {
      // Extract metadata for searching in tags
      const metadata = extractMetadata(result.name);

      // Create a searchable string that includes all metadata
      let searchableText = result.name.toLowerCase();

      // Add metadata values to the searchable text
      if (metadata.quality) searchableText += ` ${metadata.quality.toLowerCase()}`;
      if (metadata.year) searchableText += ` ${metadata.year}`;
      if (metadata.complete) {
        if (metadata.complete === 'All') {
          searchableText += ' complete series all seasons';
        } else {
          searchableText += ` s${metadata.complete} complete season`;
        }
      }
      if (metadata.season && metadata.episode) {
        searchableText += ` s${metadata.season}e${metadata.episode}`;
      }
      if (metadata.contentType) {
        searchableText += ` ${metadata.contentType}`;
      }

      // Check if the search term is in the searchable text
      return searchableText.includes(searchTerm);
    });
  }

  // Update filter options (unless we're just updating for live search)
  if (!skipFilterUpdate) {
    updateFilterOptions(years, qualities, providers);
  }

  // Check if we have results after filtering
  if (filteredResults.length === 0) {
    // Different message based on whether live search is active
    if (directSearchFilters.liveSearch) {
      directSearchResults.innerHTML = `
        <div class="text-center p-8">
          <div class="text-red-500 mb-2">
            <i class="fas fa-search-minus text-3xl mb-2"></i>
            <p>No results match "${directSearchFilters.liveSearch}"</p>
          </div>
          <div class="text-sm text-gray-400 mt-4">
            <p>Try a different search term or clear the filter</p>
            <button
              class="btn btn-sm bg-gray-700 hover:bg-gray-600 mt-2"
              onclick="document.getElementById('clear-live-search').click()"
            >
              <i class="fas fa-times mr-1"></i> Clear Search
            </button>
          </div>
        </div>
      `;
    } else {
      directSearchResults.innerHTML = `
        <div class="text-center p-8">
          <div class="text-yellow-500 mb-2">
            <i class="fas fa-filter text-3xl mb-2"></i>
            <p>No results match the selected filters</p>
          </div>
          <div class="text-sm text-gray-400 mt-4">
            <p>Try different filter settings</p>
          </div>
        </div>
      `;
    }
    return;
  }

  // Create results HTML
  let html = `
    <div class="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
      <div class="text-sm text-gray-400">
        ${directSearchFilters.liveSearch ?
          `Showing ${filteredResults.length} of ${filteredDirectResults.length} filtered results` :
          `Showing ${filteredResults.length} of ${results.length} results`
        }
        ${directSearchFilters.liveSearch ?
          `<span class="ml-2 tag tag-quality">Search: "${directSearchFilters.liveSearch}"</span>` :
          ''
        }
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          id="select-all-btn"
          class="btn btn-sm bg-gray-700 hover:bg-gray-600"
        >
          <i class="fas fa-check-square mr-1"></i> Select All
        </button>
        <button
          id="select-seasons-btn"
          class="btn btn-sm bg-purple-600 hover:bg-purple-700"
          onclick="selectAllDirectSeasons()"
          title="Select best complete season pack for each season (ignores individual episodes)"
        >
          <i class="fas fa-tv mr-1"></i> Select Complete Show
        </button>
        <button
          id="download-selected-btn"
          class="btn btn-primary btn-sm hidden"
          onclick="downloadSelectedDirectTorrents()"
        >
          <i class="fas fa-download mr-1"></i> Download Selected
        </button>
      </div>
    </div>
  `;

  // Check if we're on mobile
  const isMobile = window.innerWidth < 640;

  if (isMobile) {
    // Mobile card layout
    html += '<div class="space-y-2">';

    filteredResults.forEach(result => {
      const metadata = extractMetadata(result.name);

      // Prepare highlighted name if live search is active
      let highlightedName = result.name;
      if (directSearchFilters.liveSearch) {
        const searchTerm = directSearchFilters.liveSearch.toLowerCase();
        if (result.name.toLowerCase().includes(searchTerm)) {
          // Create a case-insensitive regex for highlighting
          const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          highlightedName = result.name.replace(regex, '<span class="highlight-match">$1</span>');
        }
      }

      html += `
        <div class="card p-4">
          <div class="flex items-start">
            <div class="mr-3 mt-1">
              <input
                type="checkbox"
                class="form-checkbox direct-torrent-checkbox"
                data-hash="${result.info_hash}"
                data-name="${result.name.replace(/"/g, '&quot;')}"
                onchange="updateSelectedDirectTorrents()"
              >
            </div>
            <div class="flex-1">
              <h3 class="text-base font-semibold mb-2 mobile-result-title">${highlightedName}</h3>

              <div class="flex flex-wrap gap-1 mb-2 w-full">
                ${result.provider ?
                  `<span class="tag tag-provider ${directSearchFilters.liveSearch && result.provider.toLowerCase().includes(directSearchFilters.liveSearch.toLowerCase()) ? 'highlight-tag' : ''}">
                    ${result.provider}
                  </span>` : ''}
                ${metadata.quality ?
                  `<span class="tag tag-quality ${directSearchFilters.liveSearch && metadata.quality.toLowerCase().includes(directSearchFilters.liveSearch.toLowerCase()) ? 'highlight-tag' : ''}">
                    ${metadata.quality}
                  </span>` : ''
                }
                ${metadata.year ?
                  `<span class="tag tag-year ${directSearchFilters.liveSearch && String(metadata.year).includes(directSearchFilters.liveSearch) ? 'highlight-tag' : ''}">
                    ${metadata.year}
                  </span>` : ''
                }
                ${metadata.complete ?
                  `<span class="tag tag-complete ${directSearchFilters.liveSearch && (directSearchFilters.liveSearch.toLowerCase().includes('complete') || directSearchFilters.liveSearch.toLowerCase().includes('s' + metadata.complete)) ? 'highlight-tag' : ''}">
                    S${metadata.complete} Complete
                  </span>` : ''
                }
                ${metadata.season && metadata.episode ?
                  `<span class="tag tag-episode ${directSearchFilters.liveSearch && ('s' + metadata.season + 'e' + metadata.episode).toLowerCase().includes(directSearchFilters.liveSearch.toLowerCase()) ? 'highlight-tag' : ''}">
                    S${metadata.season}E${metadata.episode}
                  </span>` : ''
                }
                ${metadata.contentType ?
                  `<span class="tag tag-${metadata.contentType} ${directSearchFilters.liveSearch && metadata.contentType.toLowerCase().includes(directSearchFilters.liveSearch.toLowerCase()) ? 'highlight-tag' : ''}">
                    ${metadata.contentType === 'movie' ? 'Movie' : 'TV Show'}
                  </span>` : ''
                }
              </div>

              <div class="flex flex-wrap text-sm text-gray-400 mb-2">
                <span class="mr-3 truncate"><i class="fas fa-folder"></i> ${result.category}</span>
                <span class="truncate"><i class="fas fa-calendar"></i> ${formatDate(result.added)}</span>
              </div>

              <div class="grid grid-cols-3 gap-1 text-sm mb-3">
                <span class="truncate"><i class="fas fa-hdd"></i> ${formatFileSize(parseInt(result.size))}</span>
                <span class="text-green-500 text-center"><i class="fas fa-arrow-up"></i> ${result.seeders}</span>
                <span class="text-red-500 text-right"><i class="fas fa-arrow-down"></i> ${result.leechers}</span>
              </div>

              <div class="flex justify-end">
                <button
                  class="btn btn-primary btn-sm"
                  onclick="downloadTorrent('${result.info_hash}', '${result.name.replace(/'/g, "\\'")}')"
                >
                  <i class="fas fa-download mr-1"></i> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
  } else {
    // Desktop table layout
    html += `
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th class="py-1 sm:py-2 col-checkbox"></th>
              <th class="py-1 sm:py-2 col-name">Name</th>
              <th class="py-1 sm:py-2 text-center col-size">Size</th>
              <th class="py-1 sm:py-2 text-center col-seeders">S</th>
              <th class="py-1 sm:py-2 text-center col-leechers">L</th>
              <th class="py-1 sm:py-2 text-center col-actions"></th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredResults.forEach(result => {
      const metadata = extractMetadata(result.name);

      // Prepare highlighted name if live search is active
      let highlightedName = result.name;
      if (directSearchFilters.liveSearch) {
        const searchTerm = directSearchFilters.liveSearch.toLowerCase();
        if (result.name.toLowerCase().includes(searchTerm)) {
          // Create a case-insensitive regex for highlighting
          const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          highlightedName = result.name.replace(regex, '<span class="highlight-match">$1</span>');
        }
      }

      html += `
        <tr>
          <td class="py-1 sm:py-2">
            <input
              type="checkbox"
              class="form-checkbox direct-torrent-checkbox"
              data-hash="${result.info_hash}"
              data-name="${result.name.replace(/"/g, '&quot;')}"
              onchange="updateSelectedDirectTorrents()"
            >
          </td>
          <td class="py-1 sm:py-2">
            <div class="font-medium">${highlightedName}</div>
            <div class="flex flex-wrap gap-1 mt-1">
              ${result.provider ?
                `<span class="tag tag-provider ${directSearchFilters.liveSearch && result.provider.toLowerCase().includes(directSearchFilters.liveSearch.toLowerCase()) ? 'highlight-tag' : ''}">
                  ${result.provider}
                </span>` : ''}
              ${metadata.quality ?
                `<span class="tag tag-quality ${directSearchFilters.liveSearch && metadata.quality.toLowerCase().includes(directSearchFilters.liveSearch.toLowerCase()) ? 'highlight-tag' : ''}">
                  ${metadata.quality}
                </span>` : ''
              }
              ${metadata.year ?
                `<span class="tag tag-year ${directSearchFilters.liveSearch && String(metadata.year).includes(directSearchFilters.liveSearch) ? 'highlight-tag' : ''}">
                  ${metadata.year}
                </span>` : ''
              }
              ${metadata.complete ?
                `<span class="tag tag-complete ${directSearchFilters.liveSearch && (directSearchFilters.liveSearch.toLowerCase().includes('complete') || directSearchFilters.liveSearch.toLowerCase().includes('s' + metadata.complete)) ? 'highlight-tag' : ''}">
                  S${metadata.complete} Complete
                </span>` : ''
              }
              ${metadata.season && metadata.episode ?
                `<span class="tag tag-episode ${directSearchFilters.liveSearch && ('s' + metadata.season + 'e' + metadata.episode).toLowerCase().includes(directSearchFilters.liveSearch.toLowerCase()) ? 'highlight-tag' : ''}">
                  S${metadata.season}E${metadata.episode}
                </span>` : ''
              }
              ${metadata.contentType ?
                `<span class="tag tag-${metadata.contentType} ${directSearchFilters.liveSearch && metadata.contentType.toLowerCase().includes(directSearchFilters.liveSearch.toLowerCase()) ? 'highlight-tag' : ''}">
                  ${metadata.contentType === 'movie' ? 'Movie' : 'TV Show'}
                </span>` : ''
              }
            </div>
          </td>
          <td class="py-1 sm:py-2 text-center">${formatFileSize(parseInt(result.size))}</td>
          <td class="py-1 sm:py-2 text-center text-green-500">${result.seeders}</td>
          <td class="py-1 sm:py-2 text-center text-red-500">${result.leechers}</td>
          <td class="py-1 sm:py-2 text-center">
            <button
              class="btn btn-primary btn-sm"
              onclick="downloadTorrent('${result.info_hash}', '${result.name.replace(/'/g, "\\'")}')"
            >
              <i class="fas fa-download mr-1"></i> Download
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  directSearchResults.innerHTML = html;

  // Initialize the select all button with the correct onclick handler
  const selectAllBtn = document.getElementById('select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.setAttribute('onclick', 'toggleAllDirectTorrents(true)');
  }

  // Update the button states based on any pre-selected checkboxes
  updateSelectedDirectTorrents();
}

// Update filter options based on available data
function updateFilterOptions(years, qualities, providers) {
  const yearFilter = document.getElementById('year-filter');
  const qualityFilter = document.getElementById('quality-filter');
  const providerFilter = document.getElementById('provider-filter');

  if (yearFilter) {
    // Get current selection
    const currentYear = yearFilter.value;

    // Clear existing options except the first one
    while (yearFilter.options.length > 1) {
      yearFilter.remove(1);
    }

    // Add new options
    Array.from(years).sort((a, b) => b - a).forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      if (currentYear && parseInt(currentYear) === year) {
        option.selected = true;
      }
      yearFilter.appendChild(option);
    });
  }

  if (qualityFilter) {
    // Get current selection
    const currentQuality = qualityFilter.value;

    // Clear existing options except the first one
    while (qualityFilter.options.length > 1) {
      qualityFilter.remove(1);
    }

    // Add new options
    Array.from(qualities).sort().forEach(quality => {
      const option = document.createElement('option');
      option.value = quality;
      option.textContent = quality;
      if (currentQuality === quality) {
        option.selected = true;
      }
      qualityFilter.appendChild(option);
    });
  }

  if (providerFilter) {
    // Get current selection
    const currentProvider = providerFilter.value;

    // Clear existing options except the first one
    while (providerFilter.options.length > 1) {
      providerFilter.remove(1);
    }

    // Add new options
    Array.from(providers).sort().forEach(provider => {
      const option = document.createElement('option');
      option.value = provider;
      option.textContent = provider;
      if (currentProvider === provider) {
        option.selected = true;
      }
      providerFilter.appendChild(option);
    });
  }
}

// Toggle all direct search torrents
function toggleAllDirectTorrents(checked) {
  const checkboxes = document.querySelectorAll('.direct-torrent-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = checked;
  });

  updateSelectedDirectTorrents();
}

// Select all seasons in the range (1 to highest season found)
function selectAllDirectSeasons() {
  const checkboxes = document.querySelectorAll('.direct-torrent-checkbox');
  let maxSeason = 0;
  let selectedCount = 0;

  // First pass: find the highest season number from complete seasons only
  checkboxes.forEach(checkbox => {
    const torrentName = checkbox.getAttribute('data-name');
    if (torrentName) {
      const metadata = extractMetadata(torrentName);

      // Only check complete seasons, ignore individual episodes
      if (metadata.complete && typeof metadata.complete === 'number') {
        maxSeason = Math.max(maxSeason, metadata.complete);
      }
    }
  });

  if (maxSeason === 0) {
    showToast('No complete TV show seasons found to select', 'info');
    return;
  }

  // Group complete seasons by season number
  const seasonGroups = {};
  
  checkboxes.forEach(checkbox => {
    const torrentName = checkbox.getAttribute('data-name');
    if (torrentName) {
      const metadata = extractMetadata(torrentName);

      // Only consider complete seasons in our range, ignore individual episodes
      if (metadata.complete && typeof metadata.complete === 'number') {
        const seasonNum = metadata.complete;
        if (seasonNum >= 1 && seasonNum <= maxSeason) {
          if (!seasonGroups[seasonNum]) {
            seasonGroups[seasonNum] = [];
          }

          // Get torrent info for comparison
          const torrentRow = checkbox.closest('tr') || checkbox.closest('.card');
          let seeders = 0;
          let size = 0;

          if (torrentRow) {
            // Try to extract seeders from the torrent data
            const seedersElement = torrentRow.querySelector('.text-green-500');
            if (seedersElement) {
              const seedersText = seedersElement.textContent.trim();
              seeders = parseInt(seedersText.replace(/[^\d]/g, '')) || 0;
            }

            // Try to extract size
            const sizeElement = torrentRow.querySelector('[class*="fas fa-hdd"]');
            if (sizeElement && sizeElement.parentElement) {
              const sizeText = sizeElement.parentElement.textContent.trim();
              // Basic size parsing - could be improved
              if (sizeText.includes('GB')) {
                const gbMatch = sizeText.match(/(\d+(?:\.\d+)?)\s*GB/);
                if (gbMatch) size = parseFloat(gbMatch[1]) * 1024; // Convert to MB for comparison
              } else if (sizeText.includes('MB')) {
                const mbMatch = sizeText.match(/(\d+(?:\.\d+)?)\s*MB/);
                if (mbMatch) size = parseFloat(mbMatch[1]);
              }
            }
          }

          seasonGroups[seasonNum].push({
            checkbox,
            metadata,
            seeders,
            size,
            name: torrentName
          });
        }
      }

      // Special case: if it's marked as "All" seasons, add it as a separate option
      if (metadata.complete === 'All') {
        if (!seasonGroups['All']) {
          seasonGroups['All'] = [];
        }

        const torrentRow = checkbox.closest('tr') || checkbox.closest('.card');
        let seeders = 0;

        if (torrentRow) {
          const seedersElement = torrentRow.querySelector('.text-green-500');
          if (seedersElement) {
            const seedersText = seedersElement.textContent.trim();
            seeders = parseInt(seedersText.replace(/[^\d]/g, '')) || 0;
          }
        }

        seasonGroups['All'].push({
          checkbox,
          metadata,
          seeders,
          size: 0,
          name: torrentName
        });
      }
    }
  });

  // Select the best torrent for each season
  for (const seasonNum in seasonGroups) {
    const torrents = seasonGroups[seasonNum];
    if (torrents.length > 0) {
      // Sort by seeders (descending), then by size (descending) as tiebreaker
      torrents.sort((a, b) => {
        if (b.seeders !== a.seeders) {
          return b.seeders - a.seeders; // Higher seeders first
        }
        return b.size - a.size; // Larger size as tiebreaker
      });

      // Select the best one
      const bestTorrent = torrents[0];
      bestTorrent.checkbox.checked = true;
      selectedCount++;
    }
  }

  // Update the selected torrents
  updateSelectedDirectTorrents();

  // Show a toast notification
  if (selectedCount > 0) {
    if (seasonGroups['All'] && seasonGroups['All'].length > 0) {
      showToast(`Selected ${selectedCount} season packs (including complete series)`, 'success');
    } else {
      showToast(`Selected ${selectedCount} season packs from seasons 1-${maxSeason}`, 'success');
    }
  } else {
    showToast('No complete season packs found to select', 'info');
  }
}

// Update selected direct search torrents
function updateSelectedDirectTorrents() {
  const checkboxes = document.querySelectorAll('.direct-torrent-checkbox');
  const checkedCheckboxes = document.querySelectorAll('.direct-torrent-checkbox:checked');
  const downloadSelectedBtn = document.getElementById('download-selected-btn');
  const selectAllBtn = document.getElementById('select-all-btn');

  // Update download button
  if (downloadSelectedBtn) {
    if (checkedCheckboxes.length > 0) {
      downloadSelectedBtn.classList.remove('hidden');
      downloadSelectedBtn.textContent = `Download Selected (${checkedCheckboxes.length})`;
    } else {
      downloadSelectedBtn.classList.add('hidden');
    }
  }

  // Update select all button text and icon
  if (selectAllBtn) {
    if (checkedCheckboxes.length > 0) {
      // If some or all checkboxes are checked
      if (checkedCheckboxes.length === checkboxes.length) {
        // All are checked - show "Deselect All"
        selectAllBtn.innerHTML = '<i class="fas fa-square mr-1"></i> Deselect All';
        selectAllBtn.setAttribute('onclick', 'toggleAllDirectTorrents(false)');
      } else {
        // Some are checked - show "Select All"
        selectAllBtn.innerHTML = '<i class="fas fa-check-square mr-1"></i> Select All';
        selectAllBtn.setAttribute('onclick', 'toggleAllDirectTorrents(true)');
      }
    } else {
      // None are checked - show "Select All"
      selectAllBtn.innerHTML = '<i class="fas fa-check-square mr-1"></i> Select All';
      selectAllBtn.setAttribute('onclick', 'toggleAllDirectTorrents(true)');
    }
  }
}

// Download selected direct search torrents
function downloadSelectedDirectTorrents() {
  const checkboxes = document.querySelectorAll('.direct-torrent-checkbox:checked');
  if (checkboxes.length === 0) return;

  // Collect selected torrents
  const selectedTorrents = [];
  checkboxes.forEach(checkbox => {
    selectedTorrents.push({
      hash: checkbox.getAttribute('data-hash'),
      name: checkbox.getAttribute('data-name')
    });
  });

  // Determine content type for path selection
  let contentType = null;

  // If we have a content type filter active, use that
  if (directSearchFilters.contentType !== 'all') {
    contentType = directSearchFilters.contentType;
  } else {
    // Otherwise try to determine from the selected torrents
    contentType = determineContentType(selectedTorrents);
  }

  // Set the appropriate download path
  let downloadPath = '/media/movies';
  if (contentType === 'tvshow') {
    downloadPath = '/media/shows';
  }

  // Show the download modal with multiple torrents
  const modal = document.getElementById('download-modal');
  const modalNameEl = document.getElementById('download-name');
  const downloadForm = document.getElementById('download-form');
  const downloadPathSelect = document.getElementById('download-path');

  if (modal && modalNameEl && downloadForm && downloadPathSelect) {
    // Set torrent names in modal
    let namesHtml = '<ul class="list-disc pl-5 text-sm">';
    selectedTorrents.forEach(torrent => {
      namesHtml += `<li>${torrent.name}</li>`;
    });
    namesHtml += '</ul>';

    if (selectedTorrents.length > 5) {
      namesHtml = `<p class="font-semibold">${selectedTorrents.length} torrents selected</p>`;
    }

    modalNameEl.innerHTML = namesHtml;

    // Set data attributes for form submission
    downloadForm.removeAttribute('data-hash');
    downloadForm.removeAttribute('data-name');
    downloadForm.setAttribute('data-torrents', JSON.stringify(selectedTorrents));

    // Set the download path based on content type
    downloadPathSelect.value = downloadPath;

    // Show the modal
    modal.classList.remove('hidden');
  }
}

// Make functions globally available
window.toggleAllDirectTorrents = toggleAllDirectTorrents;
window.updateSelectedDirectTorrents = updateSelectedDirectTorrents;
window.downloadSelectedDirectTorrents = downloadSelectedDirectTorrents;
window.selectAllDirectSeasons = selectAllDirectSeasons;
