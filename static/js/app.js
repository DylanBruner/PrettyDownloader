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
    // First check if we have tokens in storage
    const accessToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
    const expiresAt = localStorage.getItem('token_expires_at') || sessionStorage.getItem('token_expires_at');

    // If we have tokens, check if access token is expired
    if (accessToken && refreshToken) {
      const now = Math.floor(Date.now() / 1000);

      // If access token is expired, try to refresh it
      if (expiresAt && now > expiresAt) {
        console.log('Access token expired, refreshing...');
        const refreshed = await refreshAccessToken(refreshToken);

        if (!refreshed) {
          // If refresh failed, clear tokens and redirect to login
          clearAuthTokens();
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return;
        }
      }

      // Use the token to get user info
      const headers = {
        'Authorization': `Bearer ${accessToken}`
      };

      const response = await fetch('/api/auth/status', { headers });
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
        return;
      }
    }

    // If no tokens or token validation failed, check session-based auth as fallback
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

    // On error, clear tokens and redirect to login if not already there
    clearAuthTokens();
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
}

// Refresh the access token using the refresh token
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    const data = await response.json();

    if (data.success) {
      // Update the access token in storage
      if (localStorage.getItem('refresh_token')) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('is_admin', data.is_admin);
      } else {
        sessionStorage.setItem('access_token', data.access_token);
        sessionStorage.setItem('username', data.username);
        sessionStorage.setItem('is_admin', data.is_admin);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

// Clear authentication tokens from storage
function clearAuthTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token_expires_at');
  localStorage.removeItem('username');
  localStorage.removeItem('is_admin');

  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('token_expires_at');
  sessionStorage.removeItem('username');
  sessionStorage.removeItem('is_admin');
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
    // Get refresh token from storage
    const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');

    // Clear tokens from storage
    clearAuthTokens();

    // Call logout API to invalidate the token on the server
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    });

    if (response.ok) {
      // Redirect to login page
      window.location.href = '/login';
    } else {
      showToast('Logout failed', 'error');
      // Still redirect to login page even if server-side logout fails
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Error during logout:', error);
    showToast('Error during logout', 'error');
    // Still redirect to login page on error
    window.location.href = '/login';
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
  const modalContent = document.getElementById('media-details-content');
  const modalHeader = modalCard ? modalCard.querySelector('.sticky') : null;

  if (modal && modalCard && modalContent && modalHeader) {
    // Add touch event listeners to ensure scrolling works on mobile
    modalCard.addEventListener('touchmove', function(e) {
      e.stopPropagation();
    }, { passive: true });

    modalContent.addEventListener('touchmove', function(e) {
      e.stopPropagation();
    }, { passive: true });

    // For iOS Safari, we need to ensure the modal doesn't exceed viewport height
    const viewportHeight = window.innerHeight;
    const headerHeight = modalHeader.offsetHeight;
    const isMobile = window.innerWidth < 640;

    // Make sure the header has the right background and shadow
    modalHeader.style.backgroundColor = 'var(--card-bg)';
    modalHeader.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';

    if (isMobile) {
      // On mobile, make the modal take up more of the screen
      modalCard.style.maxHeight = (viewportHeight * 0.9) + 'px';
      modalCard.style.height = (viewportHeight * 0.9) + 'px';

      // Ensure the content area gets the remaining height after the header
      modalContent.style.height = `calc(${viewportHeight * 0.9}px - ${headerHeight}px)`;
      modalContent.style.maxHeight = `calc(${viewportHeight * 0.9}px - ${headerHeight}px)`;
      modalContent.style.overflowY = 'auto';

      console.log('Adjusted modal for mobile:', modalCard.style.maxHeight);
    } else {
      // On desktop, set a good height that works for most screens
      modalCard.style.maxHeight = (viewportHeight * 0.85) + 'px';
      modalCard.style.height = (viewportHeight * 0.85) + 'px';

      // Ensure the content area gets the remaining height after the header
      modalContent.style.height = `calc(${viewportHeight * 0.85}px - ${headerHeight}px)`;
      modalContent.style.maxHeight = `calc(${viewportHeight * 0.85}px - ${headerHeight}px)`;
      modalContent.style.overflowY = 'auto';
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
  try {
    // Fetch media details from TMDB
    const response = await fetch(`/api/tmdb/details?id=${id}&type=${mediaType}`);
    const data = await response.json();

    if (data.success && data.details) {
      // Instead of showing the modal, redirect to direct search with the search term prefilled
      const searchQuery = data.details.year ? `${data.details.title} ${data.details.year}` : data.details.title;

      // Use location.replace instead of location.href to avoid adding to browser history
      // This might help with the page refresh issue
      const url = `/directsearch?q=${encodeURIComponent(searchQuery)}`;
      console.log('Redirecting to:', url);

      // Create a form and submit it programmatically to navigate to the direct search page
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = '/directsearch';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'q';
      input.value = searchQuery;

      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } else {
      console.error('Failed to load details');
    }
  } catch (error) {
    console.error('Error fetching media details:', error);
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
      <div class="flex flex-col sm:flex-row gap-4">
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
          <div class="mb-4">
            <div class="flex flex-wrap items-center gap-2 mb-3">
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
            <p class="text-gray-300 text-sm sm:text-base">${details.overview || 'No overview available'}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            ${details.genres && details.genres.length > 0 ? `
              <div>
                <h3 class="text-xs sm:text-sm font-semibold text-gray-400 mb-1">Genres</h3>
                <div class="flex flex-wrap gap-1">
                  ${details.genres.map(genre => `
                    <span class="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs sm:text-sm">${genre.name}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${details.cast && details.cast.length > 0 ? `
              <div>
                <h3 class="text-xs sm:text-sm font-semibold text-gray-400 mb-1">Cast</h3>
                <div class="flex flex-wrap gap-1">
                  ${details.cast.map(person => `
                    <span class="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs sm:text-sm">${person.name}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${(details.directors && details.directors.length > 0) ? `
              <div>
                <h3 class="text-xs sm:text-sm font-semibold text-gray-400 mb-1">Director</h3>
                <div class="flex flex-wrap gap-1">
                  ${details.directors.map(person => `
                    <span class="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs sm:text-sm">${person.name}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${(details.creators && details.creators.length > 0) ? `
              <div>
                <h3 class="text-xs sm:text-sm font-semibold text-gray-400 mb-1">Created By</h3>
                <div class="flex flex-wrap gap-1">
                  ${details.creators.map(person => `
                    <span class="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs sm:text-sm">${person.name}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="mt-4">
        <h3 class="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Available Torrents</h3>
        <div class="media-torrents-container">
          <div id="media-torrents" class="p-2">
            <div class="flex justify-center p-3"><div class="loader"></div></div>
          </div>
        </div>
      </div>
    `;

    modalContent.innerHTML = html;
  }
}

// Global variable to store all torrents for filtering
let allTorrents = [];

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

      // Store all torrents globally for filtering
      allTorrents = data;

      // Display torrents
      displayMediaTorrents(data);
    } catch (error) {
      console.error('Error fetching torrents:', error);
      torrentsContainer.innerHTML = '<div class="text-center p-4 text-red-500">Error loading torrents. Please try again.</div>';
    }
  }
}

// Array to store selected torrents
let selectedTorrents = [];

// Display torrents for media
function displayMediaTorrents(torrents, filters = {}) {
  const torrentsContainer = document.getElementById('media-torrents');

  if (torrentsContainer) {
    // Clear selected torrents when displaying new ones
    selectedTorrents = [];

    if (!torrents || torrents.length === 0) {
      torrentsContainer.innerHTML = '<div class="text-center p-4 text-gray-400">No torrents found</div>';
      return;
    }

    // Extract unique filter values
    const qualities = new Set();
    const years = new Set();
    const episodeTypes = new Set(['all', 'complete', 'single']);
    const providers = new Set();

    // Process torrents to extract filter values and apply filters
    let filteredTorrents = torrents.filter(torrent => {
      const metadata = extractMetadata(torrent.name);

      // Add to filter options
      if (metadata.quality) qualities.add(metadata.quality);
      if (metadata.year) years.add(metadata.year);
      if (torrent.provider) providers.add(torrent.provider);

      // Apply filters if they exist
      if (filters.quality && metadata.quality !== filters.quality) return false;
      if (filters.year && metadata.year !== filters.year) return false;
      if (filters.episodeType === 'complete' && !metadata.complete) return false;
      if (filters.episodeType === 'single' && metadata.complete) return false;
      if (filters.provider && torrent.provider !== filters.provider) return false;

      return true;
    });

    // Check if we're on mobile
    const isMobile = window.innerWidth < 640;

    // Create filter controls
    let filterHtml = `
      <div class="filter-controls">
        <div class="filter-group">
          <span class="filter-group-label">Quality</span>
          <select id="quality-filter" class="filter-select" onchange="applyTorrentFilters()">
            <option value="">All</option>
            ${Array.from(qualities).sort().map(q =>
              `<option value="${q}" ${filters.quality === q ? 'selected' : ''}>${q}</option>`
            ).join('')}
          </select>
        </div>

        <div class="filter-group">
          <span class="filter-group-label">Year</span>
          <select id="year-filter" class="filter-select" onchange="applyTorrentFilters()">
            <option value="">All</option>
            ${Array.from(years).sort((a, b) => b - a).map(y =>
              `<option value="${y}" ${filters.year === y ? 'selected' : ''}>${y}</option>`
            ).join('')}
          </select>
        </div>

        <div class="filter-group">
          <span class="filter-group-label">Type</span>
          <select id="episode-type-filter" class="filter-select" onchange="applyTorrentFilters()">
            ${Array.from(episodeTypes).map(t =>
              `<option value="${t}" ${filters.episodeType === t ? 'selected' : ''}>${t === 'all' ? 'All' : t === 'complete' ? 'Complete Seasons' : 'Single Episodes'}</option>`
            ).join('')}
          </select>
        </div>

        ${providers.size > 1 ? `
        <div class="filter-group">
          <span class="filter-group-label">Provider</span>
          <select id="provider-filter" class="filter-select" onchange="applyTorrentFilters()">
            <option value="">All</option>
            ${Array.from(providers).sort().map(p =>
              `<option value="${p}" ${filters.provider === p ? 'selected' : ''}>${p}</option>`
            ).join('')}
          </select>
        </div>
        ` : ''}

        <div class="filter-group">
          <span class="filter-group-label">&nbsp;</span>
          <div class="flex space-x-2">
            <button class="filter-reset" onclick="resetTorrentFilters()">
              <i class="fas fa-times mr-1"></i> Reset Filters
            </button>
            <button id="select-all-complete-btn" class="filter-action hidden" onclick="selectAllCompleteSeasons()">
              <i class="fas fa-check-double mr-1"></i> Select All Complete
            </button>
          </div>
        </div>

        <div class="filter-group ml-auto">
          <span class="filter-group-label">Results</span>
          <div class="text-sm">
            <span class="font-medium">${filteredTorrents.length}</span> of ${torrents.length} torrents
            ${Object.keys(filters).length > 0 ? '<span class="filter-badge">Filtered</span>' : ''}
          </div>
        </div>
      </div>
    `;

    let html = filterHtml + `
      <div class="mb-2 flex justify-between items-center">
        <div>
          <label class="inline-flex items-center cursor-pointer">
            <input type="checkbox" id="select-all-torrents" class="form-checkbox" onchange="toggleAllTorrents(this.checked)">
            <span class="ml-2 text-sm">Select All</span>
          </label>
        </div>
        <button
          id="download-selected-btn"
          class="btn btn-primary btn-sm hidden"
          onclick="downloadSelectedTorrents()"
        >
          <i class="fas fa-download mr-1"></i> Download Selected
        </button>
      </div>
    `;

    if (isMobile) {
      // Mobile-optimized layout
      html += `<div class="space-y-2">`;

      filteredTorrents.forEach(torrent => {
        // Extract metadata from filename
        const metadata = extractMetadata(torrent.name);

        // Create metadata chips HTML
        let metadataChips = '';
        if (metadata.quality || metadata.season || metadata.episode || metadata.year || metadata.complete) {
          metadataChips = '<div class="metadata-chips">';

          if (metadata.quality) {
            metadataChips += `<span class="metadata-chip chip-quality">${metadata.quality}</span>`;
          }

          if (metadata.complete) {
            if (metadata.complete === 'All') {
              metadataChips += `<span class="metadata-chip chip-complete">Complete Series</span>`;
            } else {
              metadataChips += `<span class="metadata-chip chip-complete">S${metadata.complete.toString().padStart(2, '0')} Complete</span>`;
            }
          } else if (metadata.season && metadata.episode) {
            metadataChips += `<span class="metadata-chip chip-season">S${metadata.season.toString().padStart(2, '0')}E${metadata.episode.toString().padStart(2, '0')}</span>`;
          }

          if (metadata.year) {
            metadataChips += `<span class="metadata-chip chip-year">${metadata.year}</span>`;
          }

          metadataChips += '</div>';
        }

        html += `
          <div class="p-2 border border-gray-700 rounded bg-gray-800 bg-opacity-50" data-provider="${torrent.provider || ''}">
            <div class="flex items-center mb-1">
              <input
                type="checkbox"
                class="form-checkbox torrent-checkbox mr-2"
                data-hash="${torrent.info_hash}"
                data-name="${torrent.name.replace(/"/g, '&quot;')}"
                onchange="updateSelectedTorrents()"
              >
              <div class="font-medium truncate flex-1" title="${torrent.name}">${torrent.name}</div>
            </div>
            ${metadataChips}
            <div class="flex justify-between text-sm mb-2">
              <span>${formatFileSize(parseInt(torrent.size))}</span>
              <span>
                <span class="text-green-500 mr-2"><i class="fas fa-arrow-up"></i> ${torrent.seeders}</span>
                <span class="text-red-500"><i class="fas fa-arrow-down"></i> ${torrent.leechers}</span>
              </span>
            </div>
            <div class="flex justify-end">
              <button
                class="btn btn-primary btn-sm"
                onclick="downloadTorrent('${torrent.info_hash}', '${torrent.name.replace(/'/g, "\\'")}'${torrent.provider ? `, '${torrent.provider}'` : ''})"
              >
                <i class="fas fa-download mr-1"></i> Download
              </button>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    } else {
      // Desktop table layout
      html += `
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

      filteredTorrents.forEach(torrent => {
        // Extract metadata from filename
        const metadata = extractMetadata(torrent.name);

        // Create metadata chips HTML
        let metadataChips = '';
        if (metadata.quality || metadata.season || metadata.episode || metadata.year || metadata.complete) {
          metadataChips = '<div class="metadata-chips">';

          if (metadata.quality) {
            metadataChips += `<span class="metadata-chip chip-quality">${metadata.quality}</span>`;
          }

          if (metadata.complete) {
            if (metadata.complete === 'All') {
              metadataChips += `<span class="metadata-chip chip-complete">Complete Series</span>`;
            } else {
              metadataChips += `<span class="metadata-chip chip-complete">S${metadata.complete.toString().padStart(2, '0')} Complete</span>`;
            }
          } else if (metadata.season && metadata.episode) {
            metadataChips += `<span class="metadata-chip chip-season">S${metadata.season.toString().padStart(2, '0')}E${metadata.episode.toString().padStart(2, '0')}</span>`;
          }

          if (metadata.year) {
            metadataChips += `<span class="metadata-chip chip-year">${metadata.year}</span>`;
          }

          metadataChips += '</div>';
        }

        html += `
          <tr class="hover:bg-gray-800" data-provider="${torrent.provider || ''}">
            <td class="py-1 sm:py-2 text-center col-checkbox">
              <input
                type="checkbox"
                class="form-checkbox torrent-checkbox"
                data-hash="${torrent.info_hash}"
                data-name="${torrent.name.replace(/"/g, '&quot;')}"
                onchange="updateSelectedTorrents()"
              >
            </td>
            <td class="py-1 sm:py-2 col-name">
              <div class="truncate" title="${torrent.name}">${torrent.name}</div>
              <div class="metadata-container" style="max-width: 100%; overflow-x: hidden;">
                ${metadataChips}
              </div>
            </td>
            <td class="py-1 sm:py-2 text-center col-size">${formatFileSize(parseInt(torrent.size))}</td>
            <td class="py-1 sm:py-2 text-center text-green-500 col-seeders">${torrent.seeders}</td>
            <td class="py-1 sm:py-2 text-center text-red-500 col-leechers">${torrent.leechers}</td>
            <td class="py-1 sm:py-2 text-center col-actions">
              <button
                class="btn btn-primary btn-sm p-1"
                onclick="downloadTorrent('${torrent.info_hash}', '${torrent.name.replace(/'/g, "\\'")}'${torrent.provider ? `, '${torrent.provider}'` : ''})"
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
    }

    torrentsContainer.innerHTML = html;
  }
}

// Toggle all torrent checkboxes
function toggleAllTorrents(checked) {
  const checkboxes = document.querySelectorAll('.torrent-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = checked;
  });
  updateSelectedTorrents();
}

// Apply torrent filters
function applyTorrentFilters() {
  const qualityFilter = document.getElementById('quality-filter');
  const yearFilter = document.getElementById('year-filter');
  const episodeTypeFilter = document.getElementById('episode-type-filter');
  const providerFilter = document.getElementById('provider-filter');
  const selectAllCompleteBtn = document.getElementById('select-all-complete-btn');

  const filters = {};

  if (qualityFilter && qualityFilter.value) {
    filters.quality = qualityFilter.value;
  }

  if (yearFilter && yearFilter.value) {
    filters.year = parseInt(yearFilter.value);
  }

  if (episodeTypeFilter && episodeTypeFilter.value !== 'all') {
    filters.episodeType = episodeTypeFilter.value;

    // Show the select all complete button only when filtering for complete seasons
    if (filters.episodeType === 'complete' && selectAllCompleteBtn) {
      selectAllCompleteBtn.classList.remove('hidden');
    } else if (selectAllCompleteBtn) {
      selectAllCompleteBtn.classList.add('hidden');
    }
  } else if (selectAllCompleteBtn) {
    selectAllCompleteBtn.classList.add('hidden');
  }

  if (providerFilter && providerFilter.value) {
    filters.provider = providerFilter.value;
  }

  // Re-display torrents with filters
  displayMediaTorrents(allTorrents, filters);
}

// Reset all torrent filters
function resetTorrentFilters() {
  const qualityFilter = document.getElementById('quality-filter');
  const yearFilter = document.getElementById('year-filter');
  const episodeTypeFilter = document.getElementById('episode-type-filter');
  const providerFilter = document.getElementById('provider-filter');
  const selectAllCompleteBtn = document.getElementById('select-all-complete-btn');

  if (qualityFilter) qualityFilter.value = '';
  if (yearFilter) yearFilter.value = '';
  if (episodeTypeFilter) episodeTypeFilter.value = 'all';
  if (providerFilter) providerFilter.value = '';

  // Hide the select all complete button
  if (selectAllCompleteBtn) {
    selectAllCompleteBtn.classList.add('hidden');
  }

  // Re-display torrents without filters
  displayMediaTorrents(allTorrents);
}

// Select all complete seasons
function selectAllCompleteSeasons() {
  // Get all visible torrent checkboxes
  const checkboxes = document.querySelectorAll('.torrent-checkbox');
  let selectedCount = 0;

  checkboxes.forEach(checkbox => {
    const torrentName = checkbox.getAttribute('data-name');
    if (torrentName) {
      const metadata = extractMetadata(torrentName);

      // Check if this is a complete season
      if (metadata.complete) {
        checkbox.checked = true;
        selectedCount++;
      }
    }
  });

  // Update the selected torrents
  updateSelectedTorrents();

  // Show a toast notification
  if (selectedCount > 0) {
    showToast(`Selected ${selectedCount} complete seasons`, 'success');
  } else {
    showToast('No complete seasons found to select', 'info');
  }
}

// Update selected torrents array based on checkboxes
function updateSelectedTorrents() {
  selectedTorrents = [];
  const checkboxes = document.querySelectorAll('.torrent-checkbox:checked');

  checkboxes.forEach(checkbox => {
    const torrentRow = checkbox.closest('tr');
    const provider = torrentRow ? torrentRow.getAttribute('data-provider') : null;

    selectedTorrents.push({
      hash: checkbox.getAttribute('data-hash'),
      name: checkbox.getAttribute('data-name'),
      provider_id: provider
    });
  });

  // Show/hide download selected button
  const downloadSelectedBtn = document.getElementById('download-selected-btn');
  if (downloadSelectedBtn) {
    if (selectedTorrents.length > 0) {
      downloadSelectedBtn.classList.remove('hidden');
    } else {
      downloadSelectedBtn.classList.add('hidden');
    }
  }

  // Update select all checkbox
  const selectAllCheckbox = document.getElementById('select-all-torrents');
  const allCheckboxes = document.querySelectorAll('.torrent-checkbox');
  if (selectAllCheckbox && allCheckboxes.length > 0) {
    selectAllCheckbox.checked = selectedTorrents.length === allCheckboxes.length;
  }
}

// Determine the most likely content type for a group of torrents
function determineContentType(torrents) {
  let movieCount = 0;
  let tvShowCount = 0;

  torrents.forEach(torrent => {
    const metadata = extractMetadata(torrent.name);
    if (metadata.contentType === 'movie') {
      movieCount++;
    } else if (metadata.contentType === 'tvshow') {
      tvShowCount++;
    }
  });

  // Return the dominant content type, or null if undetermined
  if (movieCount > tvShowCount) {
    return 'movie';
  } else if (tvShowCount > movieCount) {
    return 'tvshow';
  } else if (movieCount > 0) {
    // If tied but we have some detection, default to movie
    return 'movie';
  }

  return null;
}

// Download selected torrents
function downloadSelectedTorrents() {
  if (selectedTorrents.length === 0) {
    showToast('No torrents selected', 'warning');
    return;
  }

  // Show download modal with multiple torrents
  const modal = document.getElementById('download-modal');
  const modalNameEl = document.getElementById('download-name');
  const downloadForm = document.getElementById('download-form');
  const downloadPathSelect = document.getElementById('download-path');

  if (modal && modalNameEl && downloadForm && downloadPathSelect) {
    // Set torrents info in modal
    let torrentsList = '<ul class="text-sm mb-2 max-h-40 overflow-y-auto">';
    selectedTorrents.forEach(torrent => {
      torrentsList += `<li class="mb-1 truncate" title="${torrent.name}">${torrent.name}</li>`;
    });
    torrentsList += '</ul>';

    modalNameEl.innerHTML = `<p class="mb-2 font-bold">${selectedTorrents.length} torrents selected:</p>${torrentsList}`;

    // Store selected torrents in form data attribute as JSON
    downloadForm.setAttribute('data-torrents', JSON.stringify(selectedTorrents));

    // Auto-select the download path based on content type
    const contentType = determineContentType(selectedTorrents);
    const pathLabel = document.querySelector('label[for="download-path"]');

    if (contentType === 'movie') {
      downloadPathSelect.value = '/media/movies';
      if (pathLabel) {
        pathLabel.innerHTML = 'Save to: <span class="text-xs text-green-400 ml-1">(Auto-detected: Movies)</span>';
      }
    } else if (contentType === 'tvshow') {
      downloadPathSelect.value = '/media/shows';
      if (pathLabel) {
        pathLabel.innerHTML = 'Save to: <span class="text-xs text-green-400 ml-1">(Auto-detected: TV Shows)</span>';
      }
    } else if (pathLabel) {
      pathLabel.innerHTML = 'Save to:';
    }

    // Close the media details modal
    const mediaDetailsModal = document.getElementById('media-details-modal');
    if (mediaDetailsModal) {
      mediaDetailsModal.classList.add('hidden');
    }

    // Show download modal
    modal.classList.remove('hidden');
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
    <div class="absolute inset-0 bg-black bg-opacity-80"></div>
    <div class="card p-0 w-[95%] max-w-lg sm:max-w-2xl md:max-w-3xl z-10 flex flex-col overflow-hidden">
      <div class="flex justify-between items-center p-4 sm:p-5 sticky top-0 bg-gray-800 z-20 border-b border-gray-700">
        <h3 id="media-details-title" class="text-base sm:text-xl font-semibold truncate pr-2">Media Details</h3>
        <button
          onclick="document.getElementById('media-details-modal').classList.add('hidden')"
          class="text-gray-400 hover:text-white p-2 -mr-2 rounded-full hover:bg-gray-700"
          aria-label="Close"
        >
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>
      <div id="media-details-content" class="media-details-content p-4 sm:p-5 overflow-y-auto flex-1"></div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Download torrent
async function downloadTorrent(hash, name, provider_id) {
  // Show download modal
  const modal = document.getElementById('download-modal');
  const modalNameEl = document.getElementById('download-name');
  const downloadForm = document.getElementById('download-form');
  const downloadPathSelect = document.getElementById('download-path');

  if (modal && modalNameEl && downloadForm && downloadPathSelect) {
    // Set torrent name in modal
    modalNameEl.innerHTML = `<p class="font-semibold break-words">${name}</p>`;

    // Set data attributes for form submission
    downloadForm.setAttribute('data-hash', hash);
    downloadForm.setAttribute('data-name', name);
    if (provider_id) {
      downloadForm.setAttribute('data-provider-id', provider_id);
    } else {
      downloadForm.removeAttribute('data-provider-id');
    }

    // Clear any previous torrents data
    downloadForm.removeAttribute('data-torrents');

    // Auto-select the download path based on content type
    const metadata = extractMetadata(name);
    const pathLabel = document.querySelector('label[for="download-path"]');

    if (metadata.contentType === 'movie') {
      downloadPathSelect.value = '/media/movies';
      if (pathLabel) {
        pathLabel.innerHTML = 'Save to: <span class="text-xs text-green-400 ml-1">(Auto-detected: Movie)</span>';
      }
    } else if (metadata.contentType === 'tvshow') {
      downloadPathSelect.value = '/media/shows';
      if (pathLabel) {
        pathLabel.innerHTML = 'Save to: <span class="text-xs text-green-400 ml-1">(Auto-detected: TV Show)</span>';
      }
    } else if (pathLabel) {
      pathLabel.innerHTML = 'Save to:';
    }

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
  const torrentsJson = downloadForm.getAttribute('data-torrents');
  const hash = downloadForm.getAttribute('data-hash');
  const name = downloadForm.getAttribute('data-name');

  if (!path) {
    showToast('Please select a download path', 'error');
    return;
  }

  // Check if we're downloading multiple torrents or a single one
  if (torrentsJson) {
    // Multiple torrents
    try {
      const torrents = JSON.parse(torrentsJson);
      if (torrents.length === 0) {
        showToast('No torrents selected', 'error');
        return;
      }

      // Show loading state
      const submitBtn = document.querySelector('#download-form button[type="button"]:last-child');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Downloading...';
        submitBtn.disabled = true;
      }

      let successCount = 0;
      let failCount = 0;

      // Process each torrent sequentially to avoid overwhelming the server
      for (const torrent of torrents) {
        try {
          const response = await fetch('/api/download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              hash: torrent.hash,
              name: torrent.name,
              path: path,
              provider_id: torrent.provider_id
            })
          });

          const data = await response.json();

          if (response.ok && data.success) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to download ${torrent.name}: ${data.message || 'Unknown error'}`);
          }
        } catch (err) {
          failCount++;
          console.error(`Error downloading ${torrent.name}:`, err);
        }
      }

      // Show results
      if (successCount > 0 && failCount === 0) {
        showToast(`Started ${successCount} downloads successfully`, 'success');

        // Refresh quota display if available
        if (window.refreshQuotaDisplay) {
          window.refreshQuotaDisplay();
        }
      } else if (successCount > 0 && failCount > 0) {
        showToast(`Started ${successCount} downloads, ${failCount} failed`, 'warning');

        // Refresh quota display if available
        if (window.refreshQuotaDisplay) {
          window.refreshQuotaDisplay();
        }
      } else {
        showToast('Failed to start any downloads', 'error');
      }

      // Close modal
      const modal = document.getElementById('download-modal');
      if (modal) {
        modal.classList.add('hidden');
      }

      // Reset button state
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-download mr-1"></i> Download';
        submitBtn.disabled = false;
      }

    } catch (error) {
      console.error('Error processing multiple downloads:', error);
      showToast('Error processing downloads', 'error');
    }
  } else {
    // Single torrent
    if (!hash || !name) {
      showToast('Missing download information', 'error');
      return;
    }

    try {
      const provider_id = downloadForm.getAttribute('data-provider-id');
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hash: hash,
          name: name,
          path: path,
          provider_id: provider_id
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast(`Started download: ${name}`, 'success');

        // Refresh quota display if available
        if (window.refreshQuotaDisplay) {
          window.refreshQuotaDisplay();
        }

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

// Extract metadata from filename
function extractMetadata(filename) {
  const metadata = {
    quality: null,
    season: null,
    episode: null,
    year: null,
    complete: null,
    contentType: null // 'movie' or 'tvshow'
  };

  // Extract quality (common formats like 720p, 1080p, 4K, etc.)
  const qualityRegex = /\b(4K|8K|720p|1080p|2160p|HDTV|WEB-DL|WEBRip|BRRip|BluRay|DVDRip|HDRip|XviD|HEVC|H\.?264|H\.?265|x264|x265|REMUX)\b/i;
  const qualityMatch = filename.match(qualityRegex);
  if (qualityMatch) {
    metadata.quality = qualityMatch[0];
  }

  // Check for common quality terms if not found above
  if (!metadata.quality) {
    const commonQualityTerms = ['HD', 'UHD', 'SD', 'HQ'];
    for (const term of commonQualityTerms) {
      if (filename.includes(term)) {
        metadata.quality = term;
        break;
      }
    }
  }

  // Check for complete season patterns
  // Format: S01.COMPLETE or S01 COMPLETE
  const completeSeasonRegex = /S(\d{1,2})[\.\s]COMPLETE\b/i;
  const completeMatch = filename.match(completeSeasonRegex);
  if (completeMatch) {
    metadata.complete = parseInt(completeMatch[1]);
  }

  // Format: Season 1 Complete
  if (!metadata.complete) {
    const altCompleteRegex = /Season\s?(\d{1,2})\s?Complete\b/i;
    const altCompleteMatch = filename.match(altCompleteRegex);
    if (altCompleteMatch) {
      metadata.complete = parseInt(altCompleteMatch[1]);
    }
  }

  // Format: The.Series.Name.Complete.S01
  if (!metadata.complete) {
    const postCompleteRegex = /COMPLETE\.S(\d{1,2})\b/i;
    const postCompleteMatch = filename.match(postCompleteRegex);
    if (postCompleteMatch) {
      metadata.complete = parseInt(postCompleteMatch[1]);
    }
  }

  // Format: The.Series.Name.S01.PACK or Season.1.PACK
  if (!metadata.complete) {
    const packRegex = /S(\d{1,2})[\.\s]PACK\b|Season\s?(\d{1,2})[\.\s]PACK\b/i;
    const packMatch = filename.match(packRegex);
    if (packMatch) {
      metadata.complete = parseInt(packMatch[1] || packMatch[2]);
    }
  }

  // Format: The.Series.Name.S01.FULL.SEASON
  if (!metadata.complete) {
    const fullSeasonRegex = /S(\d{1,2})[\.\s]FULL[\.\s]SEASON\b|Season\s?(\d{1,2})[\.\s]FULL\b/i;
    const fullSeasonMatch = filename.match(fullSeasonRegex);
    if (fullSeasonMatch) {
      metadata.complete = parseInt(fullSeasonMatch[1] || fullSeasonMatch[2]);
    }
  }

  // Format: Complete Series or Complete Collection
  if (!metadata.complete && (/\bCOMPLETE\s(SERIES|COLLECTION|SEASON)\b/i.test(filename) ||
                            /\b(SERIES|COLLECTION|SEASON)\sCOMPLETE\b/i.test(filename) ||
                            /\bFULL\s(SERIES|COLLECTION|SEASON)\b/i.test(filename) ||
                            /\bALL\sSEASONS\b/i.test(filename))) {
    metadata.complete = 'All';
  }

  // Format: Season number without episode (e.g., S06 without E01)
  // This is a common pattern for complete seasons
  if (!metadata.complete) {
    const seasonOnlyRegex = /\bS(\d{1,2})\b(?!E\d{1,2})/i;
    const seasonOnlyMatch = filename.match(seasonOnlyRegex);
    if (seasonOnlyMatch && !filename.match(/\bS\d{1,2}E\d{1,2}\b/i)) {
      metadata.complete = parseInt(seasonOnlyMatch[1]);
    }
  }

  // Format: "Season X" without episode (e.g., Season 6 without Episode)
  if (!metadata.complete) {
    const seasonWordRegex = /\bSeason\s(\d{1,2})\b(?!\s+Episode)/i;
    const seasonWordMatch = filename.match(seasonWordRegex);
    if (seasonWordMatch && !filename.match(/\bSeason\s\d{1,2}\s+Episode\s\d{1,2}\b/i)) {
      metadata.complete = parseInt(seasonWordMatch[1]);
    }
  }

  // Extract season and episode (S01E01 format) if not a complete season
  if (!metadata.complete) {
    const seasonEpisodeRegex = /S(\d{1,2})E(\d{1,2})/i;
    const seasonEpisodeMatch = filename.match(seasonEpisodeRegex);
    if (seasonEpisodeMatch) {
      metadata.season = parseInt(seasonEpisodeMatch[1]);
      metadata.episode = parseInt(seasonEpisodeMatch[2]);
    }

    // Alternative season and episode format (e.g., Season 1 Episode 1)
    if (!metadata.season || !metadata.episode) {
      const altSeasonEpisodeRegex = /Season\s?(\d{1,2})\s?Episode\s?(\d{1,2})/i;
      const altMatch = filename.match(altSeasonEpisodeRegex);
      if (altMatch) {
        metadata.season = parseInt(altMatch[1]);
        metadata.episode = parseInt(altMatch[2]);
      }
    }

    // Another alternative format (e.g., 1x01)
    if (!metadata.season || !metadata.episode) {
      const numericSeasonEpRegex = /(\d{1,2})x(\d{1,2})/i;
      const numericMatch = filename.match(numericSeasonEpRegex);
      if (numericMatch) {
        metadata.season = parseInt(numericMatch[1]);
        metadata.episode = parseInt(numericMatch[2]);
      }
    }
  }

  // Extract year (4 digits in parentheses or brackets)
  const yearRegex = /[\(\[\s](\d{4})[\)\]\s]/;
  const yearMatch = filename.match(yearRegex);
  if (yearMatch) {
    metadata.year = parseInt(yearMatch[1]);
  }

  // Alternative year format (just 4 digits)
  if (!metadata.year) {
    const altYearRegex = /\b(19\d{2}|20\d{2})\b/;
    const altYearMatch = filename.match(altYearRegex);
    if (altYearMatch) {
      metadata.year = parseInt(altYearMatch[1]);
    }
  }

  // Determine content type based on extracted metadata
  if (metadata.season || metadata.episode || metadata.complete) {
    metadata.contentType = 'tvshow';
  } else if (metadata.year) {
    // If it has a year but no season/episode, it's likely a movie
    metadata.contentType = 'movie';
  } else {
    // Additional checks for TV show patterns
    const tvShowPatterns = [
      /\b(?:s\d{1,2}|season\s?\d{1,2})\b/i,  // Season indicator without episode
      /\b(?:tv series|tv show|series|episodes)\b/i,  // TV show keywords
      /\b(?:complete|full|all)\s?(?:series|seasons|collection)\b/i  // Complete series indicators
    ];

    for (const pattern of tvShowPatterns) {
      if (pattern.test(filename)) {
        metadata.contentType = 'tvshow';
        break;
      }
    }

    // Additional checks for movie patterns
    if (!metadata.contentType) {
      const moviePatterns = [
        /\b(?:movie|film)\b/i,  // Movie keywords
        /\b(?:dvdrip|bdrip|bluray|web-?dl|hdrip)\b/i,  // Common movie release types
        /\b(?:directors cut|extended|unrated)\b/i  // Movie edition types
      ];

      for (const pattern of moviePatterns) {
        if (pattern.test(filename)) {
          metadata.contentType = 'movie';
          break;
        }
      }
    }
  }

  return metadata;
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
      const rememberMe = document.getElementById('remember-me').checked;

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
            password: password,
            remember_me: rememberMe
          })
        });

        const data = await response.json();

        if (data.success) {
          // Store tokens in localStorage or sessionStorage based on remember_me
          if (rememberMe) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('token_expires_at', data.expires_at);
            localStorage.setItem('username', data.username);
            localStorage.setItem('is_admin', data.is_admin);
          } else {
            sessionStorage.setItem('access_token', data.access_token);
            sessionStorage.setItem('refresh_token', data.refresh_token);
            sessionStorage.setItem('token_expires_at', data.expires_at);
            sessionStorage.setItem('username', data.username);
            sessionStorage.setItem('is_admin', data.is_admin);
          }

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

// Make filter functions globally available
window.applyTorrentFilters = applyTorrentFilters;
window.resetTorrentFilters = resetTorrentFilters;
window.selectAllCompleteSeasons = selectAllCompleteSeasons;
window.toggleAllTorrents = toggleAllTorrents;
window.updateSelectedTorrents = updateSelectedTorrents;
window.downloadSelectedTorrents = downloadSelectedTorrents;
window.downloadTorrent = downloadTorrent;
window.showMediaDetails = showMediaDetails;
window.extractMetadata = extractMetadata;
window.formatFileSize = formatFileSize;
window.formatDate = formatDate;
window.determineContentType = determineContentType;
