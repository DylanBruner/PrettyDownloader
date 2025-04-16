// PrettyDownloader App JavaScript

// Define global toggleMobileMenu function immediately
window.toggleMobileMenu = window.toggleMobileMenu || function() {
  console.log('toggleMobileMenu called (early definition)');
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
    console.log('Toggled sidebar open class, now:', sidebar.classList.contains('open'));

    const overlay = document.querySelector('.mobile-menu-overlay');
    if (overlay) {
      overlay.classList.toggle('open');
    }

    document.body.classList.toggle('overflow-hidden');

    // Add a debug button to the page if it doesn't exist
    if (!document.getElementById('debug-toggle-button')) {
      const debugButton = document.createElement('button');
      debugButton.id = 'debug-toggle-button';
      debugButton.textContent = 'Toggle Menu';
      debugButton.style.position = 'fixed';
      debugButton.style.bottom = '20px';
      debugButton.style.right = '20px';
      debugButton.style.zIndex = '9999';
      debugButton.style.padding = '10px';
      debugButton.style.backgroundColor = 'red';
      debugButton.style.color = 'white';
      debugButton.style.border = 'none';
      debugButton.style.borderRadius = '5px';
      debugButton.onclick = function() {
        console.log('Debug button clicked');
        window.toggleMobileMenu();
        return false;
      };
      document.body.appendChild(debugButton);
    }
  }
};

// DOM Elements - using let instead of const so they can be updated later
let sidebar = document.querySelector('.sidebar');
let mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
let mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');

// These elements don't need to be reassigned
const searchForm = document.getElementById('search-form');
const searchResults = document.getElementById('search-results');
const downloadsList = document.getElementById('downloads-list');
const usersList = document.getElementById('users-list');
const logoutButton = document.getElementById('logout-button');

// Auth state
let currentUser = null;
let isAdmin = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');

  // Check authentication status
  checkAuthStatus();

  // Setup event listeners
  setupEventListeners();

  // Initialize page-specific functionality
  initPageFunctionality();

  // Add direct event listeners to mobile menu toggle buttons
  setTimeout(() => {
    const toggleButtons = document.querySelectorAll('.mobile-menu-toggle');
    console.log('Found', toggleButtons.length, 'toggle buttons after DOM loaded');

    toggleButtons.forEach((btn, index) => {
      // Remove existing onclick attribute to avoid double-triggering
      btn.removeAttribute('onclick');

      // Add direct event listener
      btn.addEventListener('click', function(e) {
        console.log(`Toggle button ${index} clicked directly`);
        e.preventDefault();
        e.stopPropagation();
        window.toggleMobileMenu();
        return false;
      });

      // Also add the handler directly to the element
      btn.onclick = function(e) {
        console.log('Button clicked via onclick property');
        e.preventDefault();
        e.stopPropagation();
        window.toggleMobileMenu();
        return false;
      };
    });

    // Add a click handler to the document to catch any clicks on the button
    document.addEventListener('click', function(e) {
      if (e.target.closest('.mobile-menu-toggle')) {
        console.log('Button clicked via document event delegation');
        window.toggleMobileMenu();
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });
  }, 200);
});

// Check if user is authenticated
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/status');
    const data = await response.json();

    if (data.authenticated) {
      currentUser = data.username;
      isAdmin = data.is_admin;

      // Update UI based on auth status
      updateAuthUI(true);

      // Show admin-only elements if user is admin
      if (isAdmin) {
        document.querySelectorAll('.admin-only').forEach(el => {
          el.classList.remove('hidden');
        });
      }
    } else {
      // Redirect to login if not authenticated and not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    showToast('Error checking authentication status', 'error');
  }
}

// Update UI based on authentication status
function updateAuthUI(isAuthenticated) {
  if (isAuthenticated && currentUser) {
    // Show username in the UI
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
      userDisplay.textContent = currentUser;
    }

    // Show authenticated-only elements
    document.querySelectorAll('.auth-only').forEach(el => {
      el.classList.remove('hidden');
    });

    // Hide non-authenticated elements
    document.querySelectorAll('.non-auth-only').forEach(el => {
      el.classList.add('hidden');
    });
  } else {
    // Hide authenticated-only elements
    document.querySelectorAll('.auth-only').forEach(el => {
      el.classList.add('hidden');
    });

    // Show non-authenticated elements
    document.querySelectorAll('.non-auth-only').forEach(el => {
      el.classList.remove('hidden');
    });
  }
}

// Setup event listeners
function setupEventListeners() {
  console.log('Setting up event listeners');

  // Re-query DOM elements to ensure we have the latest references
  sidebar = document.querySelector('.sidebar');
  mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');

  console.log('DOM elements:', {
    sidebar: sidebar,
    mobileMenuToggle: mobileMenuToggle,
    mobileMenuOverlay: mobileMenuOverlay
  });

  // Wait a short time to ensure all dynamic elements are loaded
  setTimeout(() => {
    // Re-query in case they were added after initial load
    if (!sidebar) sidebar = document.querySelector('.sidebar');
    if (!mobileMenuToggle) mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    if (!mobileMenuOverlay) mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');

    // Mobile menu toggle
    if (mobileMenuToggle) {
      console.log('Adding click event to mobileMenuToggle');
      // Remove any existing event listeners first
      const newToggle = mobileMenuToggle.cloneNode(true);
      mobileMenuToggle.parentNode.replaceChild(newToggle, mobileMenuToggle);
      mobileMenuToggle = newToggle;

      mobileMenuToggle.addEventListener('click', function() {
        console.log('Mobile menu toggle clicked');
        toggleMobileMenu();
      });
    } else {
      console.warn('Mobile menu toggle button not found');
    }

    // Mobile menu close button
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    if (mobileMenuClose) {
      mobileMenuClose.addEventListener('click', closeMobileMenu);
    }

    // Mobile menu overlay click to close
    if (mobileMenuOverlay) {
      mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    }

    // Logout button
    if (logoutButton) {
      logoutButton.addEventListener('click', handleLogout);
    }
  }, 100);
}

// Toggle mobile menu - make it globally available
window.toggleMobileMenu = function() {
  console.log('toggleMobileMenu called from app.js');

  // Re-query the sidebar in case it was dynamically added
  if (!sidebar) {
    sidebar = document.querySelector('.sidebar');
  }

  // Re-query the overlay in case it was dynamically added
  if (!mobileMenuOverlay) {
    mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
  }

  console.log('sidebar element:', sidebar);

  if (sidebar) {
    // Toggle the open class
    sidebar.classList.toggle('open');
    console.log('Toggled open class, sidebar now has open class:', sidebar.classList.contains('open'));

    // Toggle the overlay if it exists
    if (mobileMenuOverlay) {
      mobileMenuOverlay.classList.toggle('open');
    } else {
      console.warn('Mobile menu overlay not found');
    }

    // Toggle body overflow
    document.body.classList.toggle('overflow-hidden');
  } else {
    console.error('Sidebar element not found in toggleMobileMenu');

    // Try to create the sidebar if it doesn't exist
    window.toggleSidebar && window.toggleSidebar();
  }
};

// Local reference for internal use
const toggleMobileMenu = window.toggleMobileMenu;

// Close mobile menu - make it globally available
window.closeMobileMenu = function() {
  console.log('closeMobileMenu called');

  // Re-query the sidebar in case it was dynamically added
  if (!sidebar) {
    sidebar = document.querySelector('.sidebar');
  }

  // Re-query the overlay in case it was dynamically added
  if (!mobileMenuOverlay) {
    mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
  }

  if (sidebar) {
    sidebar.classList.remove('open');
  }

  if (mobileMenuOverlay) {
    mobileMenuOverlay.classList.remove('open');
  }

  document.body.classList.remove('overflow-hidden');
};

// Local reference for internal use
const closeMobileMenu = window.closeMobileMenu;

// Handle logout
async function handleLogout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      // Redirect to login page
      window.location.href = '/login';
    } else {
      showToast('Logout failed', 'error');
    }
  } catch (error) {
    console.error('Error during logout:', error);
    showToast('Error during logout', 'error');
  }
}



// Debug function for image loading
function debugImageLoad(img) {
  console.log('Image load attempt:', img.src);
  img.onload = () => console.log('Image loaded successfully:', img.src);
  img.onerror = (e) => console.error('Image failed to load:', img.src, e);
  return img;
}

// Ensure modal is scrollable on mobile devices
function ensureModalScrollable() {
  const modal = document.getElementById('media-details-modal');
  const modalCard = modal.querySelector('.card');

  if (modal && modalCard) {
    // Add touch event listeners to ensure scrolling works on mobile
    modalCard.addEventListener('touchmove', function(e) {
      e.stopPropagation();
    }, { passive: true });

    // For iOS Safari, we need to ensure the modal doesn't exceed viewport height
    const viewportHeight = window.innerHeight;
    const modalHeight = modalCard.offsetHeight;

    if (modalHeight > viewportHeight * 0.9) {
      modalCard.style.maxHeight = (viewportHeight * 0.85) + 'px';
      console.log('Adjusted modal height for mobile:', modalCard.style.maxHeight);
    }
  }
}

// Initialize page-specific functionality
function initPageFunctionality() {
  const currentPath = window.location.pathname;
  console.log('Initializing page functionality for path:', currentPath);

  // Set active sidebar link
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  // Initialize search page
  if (currentPath === '/' && searchForm) {
    console.log('Initializing search page');
    initSearchPage();
  }

  // Initialize downloads page
  if (currentPath === '/downloads' && downloadsList) {
    console.log('Initializing downloads page');
    initDownloadsPage();
  }

  // Initialize users page (admin only)
  if (currentPath === '/users') {
    console.log('On users page, usersList:', !!usersList, 'isAdmin:', isAdmin);
    if (usersList && isAdmin) {
      console.log('Initializing users page');
      initUsersPage();
    } else {
      console.log('Not initializing users page - missing usersList or not admin');
    }
  }

  // Initialize login page
  if (currentPath === '/login') {
    console.log('Initializing login page');
    initLoginPage();
  }

  // Initialize passkeys page
  if (currentPath === '/passkeys') {
    console.log('Initializing passkeys page');
    // The passkeys page has its own initialization in the HTML file
  }
}



// Show toast notification
function showToast(message, type = 'info') {
  // Remove any existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => {
    toast.remove();
  });

  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="flex items-center">
      <div class="mr-2">
        ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : ''}
        ${type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : ''}
        ${type === 'warning' ? '<i class="fas fa-exclamation-triangle"></i>' : ''}
        ${type === 'info' ? '<i class="fas fa-info-circle"></i>' : ''}
      </div>
      <div>${message}</div>
    </div>
  `;

  // Add toast to the document
  document.body.appendChild(toast);

  // Show the toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Hide the toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');

    // Remove from DOM after animation
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date
function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

// Initialize search page
function initSearchPage() {
  if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const searchInput = document.getElementById('search-input');
      const mediaTypeFilter = document.getElementById('media-type-filter');
      const query = searchInput.value.trim();
      const mediaType = mediaTypeFilter.value;

      if (query) {
        // Show loading state
        searchResults.innerHTML = '<div class="flex justify-center p-8"><div class="loader"></div></div>';

        try {
          // Search TMDB with media type filter
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&media_type=${mediaType}`);
          const data = await response.json();

          // Display search results
          displaySearchResults(data);
        } catch (error) {
          console.error('Error searching:', error);
          searchResults.innerHTML = '<div class="text-center p-8 text-red-500">Error searching. Please try again.</div>';
        }
      }
    });

    // Create media details modal if it doesn't exist
    if (!document.getElementById('media-details-modal')) {
      createMediaDetailsModal();
    }
  }
}

// Display search results
function displaySearchResults(data) {
  // Check if we have TMDB results
  if (data.results && Array.isArray(data.results)) {
    displayTMDBResults(data.results);
  } else if (Array.isArray(data)) {
    // Handle direct TPB results (fallback)
    displayTPBResults(data);
  } else {
    searchResults.innerHTML = '<div class="text-center p-8">No results found</div>';
  }
}

// Display TMDB movie/show results
function displayTMDBResults(results) {
  if (!results || results.length === 0) {
    searchResults.innerHTML = '<div class="text-center p-8">No results found</div>';
    return;
  }

  let html = '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">';

  results.forEach(result => {
    const title = result.title || result.name || 'Unknown Title';
    const year = result.year || '';
    const mediaType = result.media_type || 'movie';
    const hasPoster = result.has_poster;
    const posterUrl = result.poster_url;
    const id = result.id;

    html += `
      <div class="card p-2 cursor-pointer hover:scale-105 transition-transform"
           onclick="showMediaDetails('${id}', '${mediaType}')"
           title="${title} ${year ? `(${year})` : ''}">
        <div class="poster-container">
          ${hasPoster ?
            `<img src="${posterUrl}" alt="${title}" onload="console.log('Poster loaded:', '${title}')" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
          <div class="poster-fallback" ${hasPoster ? 'style="display: none;"' : ''}>
            <i class="fas fa-film"></i>
            <p class="text-xs text-gray-300 line-clamp-3">${title}</p>
          </div>
        </div>
        <div class="mt-2 text-center">
          <h3 class="text-sm font-semibold truncate">${title}</h3>
          ${year ? `<p class="text-xs text-gray-400">${year}</p>` : ''}
        </div>
      </div>
    `;
  });

  html += '</div>';
  searchResults.innerHTML = html;
}

// Display ThePirateBay results
function displayTPBResults(results) {
  if (!results || results.length === 0) {
    searchResults.innerHTML = '<div class="text-center p-8">No results found</div>';
    return;
  }

  let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';

  results.forEach(result => {
    html += `
      <div class="card p-4">
        <h3 class="text-lg font-semibold mb-2">${result.name}</h3>
        <div class="text-sm text-gray-400 mb-2">
          <span class="mr-3"><i class="fas fa-folder"></i> ${result.category}</span>
          <span><i class="fas fa-calendar"></i> ${formatDate(result.added)}</span>
        </div>
        <div class="flex justify-between text-sm mb-3">
          <span><i class="fas fa-hdd"></i> ${formatFileSize(parseInt(result.size))}</span>
          <span class="text-green-500"><i class="fas fa-arrow-up"></i> ${result.seeders}</span>
          <span class="text-red-500"><i class="fas fa-arrow-down"></i> ${result.leechers}</span>
        </div>
        <div class="flex justify-end">
          <button
            class="btn btn-primary download-btn"
            data-name="${result.name}"
            data-hash="${result.info_hash}"
            onclick="downloadTorrent('${result.info_hash}', '${result.name.replace(/'/g, "\\'")}')"
          >
            <i class="fas fa-download mr-1"></i> Download
          </button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  searchResults.innerHTML = html;
}

// Show media details
async function showMediaDetails(id, mediaType) {
  // Show loading state in modal
  const modal = document.getElementById('media-details-modal');
  const modalContent = document.getElementById('media-details-content');

  if (modal && modalContent) {
    // Show modal with loading state
    modalContent.innerHTML = '<div class="flex justify-center p-8"><div class="loader"></div></div>';
    modal.classList.remove('hidden');

    // Ensure modal is scrollable on mobile
    ensureModalScrollable();

    try {
      // Fetch media details from TMDB
      const response = await fetch(`/api/tmdb/details?id=${id}&type=${mediaType}`);
      const data = await response.json();

      if (data.success && data.details) {
        // Display media details
        displayMediaDetails(data.details);

        // Fetch torrents for this title
        fetchTorrentsForMedia(data.details.title, data.details.year);
      } else {
        modalContent.innerHTML = '<div class="text-center p-8 text-red-500">Failed to load details</div>';
      }
    } catch (error) {
      console.error('Error fetching media details:', error);
      modalContent.innerHTML = '<div class="text-center p-8 text-red-500">Error loading details. Please try again.</div>';
    }
  }
}

// Display media details in modal
function displayMediaDetails(details) {
  const modalContent = document.getElementById('media-details-content');
  const modalTitle = document.getElementById('media-details-title');

  if (modalContent && modalTitle) {
    // Set modal title
    modalTitle.textContent = `${details.title} ${details.year ? `(${details.year})` : ''}`;

    // Build details HTML
    let html = `
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="w-full sm:w-1/3 max-w-[180px] mx-auto sm:mx-0">
          <div class="w-full rounded-lg shadow-lg overflow-hidden" style="aspect-ratio: 2/3; background-color: var(--card-bg);">
            ${details.has_poster ?
              `<img src="${details.poster_url}" alt="${details.title}" class="w-full h-full object-cover"
                   onload="console.log('Detail poster loaded:', '${details.title}')"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
            <div class="flex items-center justify-center h-full w-full" ${details.has_poster ? 'style="display: none; position: absolute; top: 0; left: 0;"' : ''}>
              <div class="text-center p-4">
                <i class="fas fa-film text-red-500 text-5xl mb-3"></i>
                <p class="text-gray-300">${details.title}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="w-full sm:w-2/3">
          <div class="mb-3">
            <div class="flex items-center gap-2 mb-2">
              ${details.vote_average ? `
                <span class="bg-red-600 text-white px-2 py-1 rounded font-bold text-sm">
                  ${Math.round(details.vote_average * 10) / 10}
                </span>
              ` : ''}
              ${details.media_type === 'movie' ?
                `<span class="text-gray-400 text-sm">${details.release_date || ''}</span>` :
                `<span class="text-gray-400 text-sm">${details.first_air_date || ''}</span>`
              }
              ${details.runtime ? `<span class="text-gray-400 text-sm">${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m</span>` : ''}
            </div>
            <p class="text-gray-300 text-sm">${details.overview || 'No overview available'}</p>
          </div>

          <div class="grid grid-cols-2 gap-2 mb-2">
            ${details.genres && details.genres.length > 0 ? `
              <div>
                <h3 class="text-xs font-semibold text-gray-400 mb-1">Genres</h3>
                <div class="flex flex-wrap gap-1">
                  ${details.genres.map(genre => `
                    <span class="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">${genre.name}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${details.cast && details.cast.length > 0 ? `
              <div>
                <h3 class="text-xs font-semibold text-gray-400 mb-1">Cast</h3>
                <div class="flex flex-wrap gap-1">
                  ${details.cast.map(person => `
                    <span class="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">${person.name}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${(details.directors && details.directors.length > 0) ? `
              <div>
                <h3 class="text-xs font-semibold text-gray-400 mb-1">Director</h3>
                <div class="flex flex-wrap gap-1">
                  ${details.directors.map(person => `
                    <span class="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">${person.name}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${(details.creators && details.creators.length > 0) ? `
              <div>
                <h3 class="text-xs font-semibold text-gray-400 mb-1">Created By</h3>
                <div class="flex flex-wrap gap-1">
                  ${details.creators.map(person => `
                    <span class="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">${person.name}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="mt-3">
        <h3 class="text-sm sm:text-base font-semibold mb-1 sm:mb-2">Available Torrents</h3>
        <div class="media-torrents-container">
          <div id="media-torrents" class="p-1">
            <div class="flex justify-center p-2"><div class="loader"></div></div>
          </div>
        </div>
      </div>
    `;

    modalContent.innerHTML = html;
  }
}

// Fetch torrents for a media title
async function fetchTorrentsForMedia(title, year) {
  const torrentsContainer = document.getElementById('media-torrents');

  if (torrentsContainer) {
    try {
      // Create search query with title and year
      const searchQuery = year ? `${title} ${year}` : title;

      // Fetch torrents from TPB
      const response = await fetch(`/api/torrents?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      // Display torrents
      displayMediaTorrents(data);
    } catch (error) {
      console.error('Error fetching torrents:', error);
      torrentsContainer.innerHTML = '<div class="text-center p-4 text-red-500">Error loading torrents. Please try again.</div>';
    }
  }
}

// Display torrents for media
function displayMediaTorrents(torrents) {
  const torrentsContainer = document.getElementById('media-torrents');

  if (torrentsContainer) {
    if (!torrents || torrents.length === 0) {
      torrentsContainer.innerHTML = '<div class="text-center p-4 text-gray-400">No torrents found</div>';
      return;
    }

    let html = `
      <table class="table w-full">
        <thead>
          <tr>
            <th class="py-1 sm:py-2">Name</th>
            <th class="py-1 sm:py-2 text-center">Size</th>
            <th class="py-1 sm:py-2 text-center">S</th>
            <th class="py-1 sm:py-2 text-center">L</th>
            <th class="py-1 sm:py-2 text-center"></th>
          </tr>
        </thead>
        <tbody>
    `;

    torrents.forEach(torrent => {
      html += `
        <tr class="hover:bg-gray-800">
          <td class="py-1 sm:py-2 max-w-[120px] sm:max-w-xs truncate" title="${torrent.name}">${torrent.name}</td>
          <td class="py-1 sm:py-2 text-center">${formatFileSize(parseInt(torrent.size))}</td>
          <td class="py-1 sm:py-2 text-center text-green-500">${torrent.seeders}</td>
          <td class="py-1 sm:py-2 text-center text-red-500">${torrent.leechers}</td>
          <td class="py-1 sm:py-2 text-center">
            <button
              class="btn btn-primary btn-sm p-1"
              onclick="downloadTorrent('${torrent.info_hash}', '${torrent.name.replace(/'/g, "\\'")}')"
              title="Download"
            >
              <i class="fas fa-download"></i>
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
    `;

    torrentsContainer.innerHTML = html;
  }
}

// Create media details modal
function createMediaDetailsModal() {
  const modal = document.createElement('div');
  modal.id = 'media-details-modal';
  modal.className = 'fixed inset-0 flex justify-center z-50 hidden overflow-y-auto';

  // Add event listener to handle scrolling on mobile
  modal.addEventListener('touchmove', function(e) {
    // Allow default scrolling behavior
    e.stopPropagation();
  }, { passive: true });

  modal.innerHTML = `
    <div class="absolute inset-0 bg-black bg-opacity-75"></div>
    <div class="card p-3 sm:p-4 w-[95%] max-w-lg sm:max-w-2xl md:max-w-3xl z-10">
      <div class="flex justify-between items-center mb-2 sm:mb-3">
        <h3 id="media-details-title" class="text-base sm:text-lg font-semibold truncate pr-2">Media Details</h3>
        <button onclick="document.getElementById('media-details-modal').classList.add('hidden')" class="text-gray-400 hover:text-white p-2 -mr-2">
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>
      <div id="media-details-content" class="media-details-content"></div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Download torrent
async function downloadTorrent(hash, name) {
  // Show download modal
  const modal = document.getElementById('download-modal');
  const modalNameEl = document.getElementById('download-name');
  const downloadForm = document.getElementById('download-form');

  if (modal && modalNameEl && downloadForm) {
    // Set torrent name in modal
    modalNameEl.textContent = name;

    // Set data attributes for form submission
    downloadForm.setAttribute('data-hash', hash);
    downloadForm.setAttribute('data-name', name);

    // Close the media details modal
    const mediaDetailsModal = document.getElementById('media-details-modal');
    if (mediaDetailsModal) {
      mediaDetailsModal.classList.add('hidden');
      console.log('Closed media details modal when opening download modal');
    }

    // Show download modal
    modal.classList.remove('hidden');
  }
}

// Submit download
async function submitDownload(path) {
  const downloadForm = document.getElementById('download-form');
  const hash = downloadForm.getAttribute('data-hash');
  const name = downloadForm.getAttribute('data-name');

  if (!hash || !name || !path) {
    showToast('Missing download information', 'error');
    return;
  }

  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hash: hash,
        name: name,
        path: path
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showToast(`Started download: ${name}`, 'success');

      // Close modal
      const modal = document.getElementById('download-modal');
      if (modal) {
        modal.classList.add('hidden');
      }
    } else {
      showToast(data.message || 'Failed to start download', 'error');
    }
  } catch (error) {
    console.error('Error starting download:', error);
    showToast('Error starting download', 'error');
  }
}

// Initialize downloads page
function initDownloadsPage() {
  if (downloadsList) {
    // Fetch current downloads
    fetchDownloads();

    // Set up refresh button
    const refreshButton = document.getElementById('refresh-downloads');
    if (refreshButton) {
      refreshButton.addEventListener('click', fetchDownloads);
    }
  }
}

// Fetch downloads
async function fetchDownloads() {
  try {
    // Show loading state
    downloadsList.innerHTML = '<div class="flex justify-center p-8"><div class="loader"></div></div>';

    const response = await fetch('/api/fetch');
    const data = await response.json();

    if (response.status === 503) {
      // qBittorrent is disabled or authentication failed
      downloadsList.innerHTML = `<div class="text-center p-8 text-yellow-500">${data.message || 'qBittorrent service unavailable'}</div>`;
      return;
    }

    if (!response.ok) {
      downloadsList.innerHTML = `<div class="text-center p-8 text-red-500">${data.message || 'Error fetching downloads'}</div>`;
      return;
    }

    // Display downloads
    displayDownloads(data);
  } catch (error) {
    console.error('Error fetching downloads:', error);
    downloadsList.innerHTML = '<div class="text-center p-8 text-red-500">Error fetching downloads. Please try again.</div>';
  }
}

// Display downloads
function displayDownloads(downloads) {
  if (!downloads || downloads.length === 0) {
    downloadsList.innerHTML = '<div class="text-center p-8">No active downloads</div>';
    return;
  }

  let html = `
    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Size</th>
            <th>Progress</th>
            <th>Status</th>
            <th>Speed</th>
            <th>ETA</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  downloads.forEach(download => {
    const progress = Math.round(download.progress * 100);
    const status = download.state.charAt(0).toUpperCase() + download.state.slice(1);

    html += `
      <tr>
        <td class="max-w-xs truncate" title="${download.name}">${download.name}</td>
        <td>${formatFileSize(download.size)}</td>
        <td>
          <div class="w-full bg-gray-700 rounded-full h-2.5">
            <div class="bg-red-600 h-2.5 rounded-full" style="width: ${progress}%"></div>
          </div>
          <div class="text-xs text-center mt-1">${progress}%</div>
        </td>
        <td>${status}</td>
        <td>${formatFileSize(download.dlspeed)}/s</td>
        <td>${download.eta ? formatETA(download.eta) : 'N/A'}</td>
        <td>
          <button
            class="text-red-500 hover:text-red-700"
            onclick="deleteTorrent('${download.hash}', true)"
            title="Delete torrent and files"
          >
            <i class="fas fa-trash"></i>
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

  downloadsList.innerHTML = html;
}

// Format ETA
function formatETA(seconds) {
  if (seconds < 0) return 'N/A';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Delete torrent
async function deleteTorrent(hash, deleteFiles = false) {
  if (!confirm('Are you sure you want to delete this torrent and its files?')) {
    return;
  }

  try {
    const response = await fetch('/api/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hash: hash,
        deleteFiles: deleteFiles
      })
    });

    const data = await response.json();

    if (response.status === 503) {
      // qBittorrent is disabled or authentication failed
      showToast(data.message || 'qBittorrent service unavailable', 'warning');
      return;
    }

    if (response.ok && data.success) {
      showToast('Torrent deleted successfully', 'success');

      // Refresh downloads list
      fetchDownloads();
    } else {
      showToast(data.message || 'Failed to delete torrent', 'error');
    }
  } catch (error) {
    console.error('Error deleting torrent:', error);
    showToast('Error deleting torrent', 'error');
  }
}

// Initialize users page (admin only)
function initUsersPage() {
  console.log('Initializing users page');
  console.log('usersList:', usersList);
  console.log('isAdmin:', isAdmin);

  if (usersList && isAdmin) {
    console.log('Conditions met, fetching users');
    // Fetch users
    fetchUsers();

    // Set up add user form
    const addUserForm = document.getElementById('add-user-form');
    console.log('addUserForm:', addUserForm);
    if (addUserForm) {
      console.log('Setting up add user form submit handler');
      addUserForm.addEventListener('submit', handleAddUser);
    }
  } else {
    console.log('Conditions not met, not initializing users page');
  }
}

// Fetch users
async function fetchUsers() {
  console.log('Fetching users');
  try {
    // Show loading state
    usersList.innerHTML = '<div class="flex justify-center p-8"><div class="loader"></div></div>';
    console.log('Set loading state');

    console.log('Making fetch request to /api/users');
    const response = await fetch('/api/users');
    console.log('Response received:', response);

    const data = await response.json();
    console.log('Data received:', data);

    if (data.success) {
      console.log('Success, displaying users');
      // Display users
      displayUsers(data.users);
    } else {
      console.log('Error in response:', data);
      usersList.innerHTML = '<div class="text-center p-8 text-red-500">Error fetching users</div>';
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    usersList.innerHTML = '<div class="text-center p-8 text-red-500">Error fetching users. Please try again.</div>';
  }
}

// Display users
function displayUsers(users) {
  if (!users || users.length === 0) {
    usersList.innerHTML = '<div class="text-center p-8">No users found</div>';
    return;
  }

  let html = `
    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead>
          <tr>
            <th>Username</th>
            <th>Admin</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  users.forEach(user => {
    html += `
      <tr>
        <td>${user.username}</td>
        <td>${user.is_admin ? '<span class="text-green-500"><i class="fas fa-check"></i></span>' : '<span class="text-red-500"><i class="fas fa-times"></i></span>'}</td>
        <td>
          ${user.username !== currentUser ? `
            <button
              class="text-red-500 hover:text-red-700"
              onclick="deleteUser('${user.username}')"
              title="Delete user"
            >
              <i class="fas fa-trash"></i>
            </button>
          ` : '<span class="text-gray-500">Current user</span>'}
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  usersList.innerHTML = html;
}

// Handle add user
async function handleAddUser(e) {
  e.preventDefault();

  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value.trim();
  const isAdmin = document.getElementById('new-is-admin').checked;

  if (!username || !password) {
    showToast('Username and password are required', 'warning');
    return;
  }

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password,
        is_admin: isAdmin
      })
    });

    const data = await response.json();

    if (data.success) {
      showToast('User created successfully', 'success');

      // Clear form
      document.getElementById('new-username').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('new-is-admin').checked = false;

      // Refresh users list
      fetchUsers();
    } else {
      showToast(data.message || 'Failed to create user', 'error');
    }
  } catch (error) {
    console.error('Error creating user:', error);
    showToast('Error creating user', 'error');
  }
}

// Delete user
async function deleteUser(username) {
  if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/users/${username}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showToast('User deleted successfully', 'success');

      // Refresh users list
      fetchUsers();
    } else {
      showToast(data.message || 'Failed to delete user', 'error');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showToast('Error deleting user', 'error');
  }
}

// Initialize login page
function initLoginPage() {
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!username || !password) {
        showToast('Username and password are required', 'warning');
        return;
      }

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: username,
            password: password
          })
        });

        const data = await response.json();

        if (data.success) {
          // Redirect to home page
          window.location.href = '/';
        } else {
          showToast(data.message || 'Invalid username or password', 'error');
        }
      } catch (error) {
        console.error('Error during login:', error);
        showToast('Error during login', 'error');
      }
    });
  }
}
