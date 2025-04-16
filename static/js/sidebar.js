/**
 * Creates and initializes the sidebar navigation
 * This function should be called on every page to ensure consistent navigation
 */
function initSidebar() {
  // Get the current path to highlight the active link
  const currentPath = window.location.pathname;

  // Don't show sidebar on login page
  if (currentPath === '/login') {
    return;
  }

  // Check if user is admin
  let isAdmin = false;

  // Fetch auth status to determine if user is admin
  fetch('/api/auth/status')
    .then(response => response.json())
    .then(data => {
      console.log('Auth status:', data);
      isAdmin = data.is_admin;

      // Create the sidebar with the admin status
      createSidebar(isAdmin, currentPath);
    })
    .catch(error => {
      console.error('Error fetching auth status:', error);
      // Create sidebar anyway, but don't show admin links by default
      createSidebar(false, currentPath);
    });
}

/**
 * Creates the sidebar with the appropriate links based on user role
 * @param {boolean} isAdmin - Whether the current user is an admin
 * @param {string} currentPath - The current page path
 */
function createSidebar(isAdmin, currentPath) {
  console.log('Creating sidebar with isAdmin:', isAdmin, 'currentPath:', currentPath);

  // Create sidebar container if it doesn't exist
  let sidebar = document.getElementById('sidebar');

  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    sidebar.className = 'sidebar fixed top-0 bottom-0 w-64 bg-gray-900 text-white z-50 transition-all duration-300 ease-in-out';

    // On mobile, sidebar is hidden by default (CSS handles this with left: -250px)
    // No need to add any classes here as the CSS already handles the initial state

    document.body.appendChild(sidebar);

    // Create mobile menu overlay if it doesn't exist
    let overlay = document.querySelector('.mobile-menu-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mobile-menu-overlay';
      document.body.appendChild(overlay);
    }

    // Fix any existing main content div to ensure proper spacing
    try {
      // The colon in the class name needs to be escaped for querySelector
      const mainContent = document.querySelector('.flex-1.ml-0.md\\:ml-64');
      if (mainContent) {
        // Make sure the margin is correct
        mainContent.className = 'flex-1 ml-0 md:ml-64 transition-all duration-300';
      }
    } catch (error) {
      console.error('Error selecting main content div:', error);
    }
  }

  // Create sidebar content
  sidebar.innerHTML = `
    <div class="sidebar-header p-4 border-b border-gray-800">
      <div class="flex items-center">
        <i class="fas fa-download text-red-500 text-2xl mr-3"></i>
        <h1 class="text-xl font-bold">PrettyDownloader</h1>
      </div>
    </div>

    <div class="sidebar-content p-4">
      <nav>
        <ul class="space-y-2">
          <li>
            <a href="/" class="sidebar-link flex items-center p-2 rounded-md hover:bg-gray-800 ${currentPath === '/' ? 'active bg-gray-800' : ''}">
              <i class="fas fa-search w-6"></i>
              <span>Search</span>
            </a>
          </li>
          <li>
            <a href="/directsearch" class="sidebar-link flex items-center p-2 rounded-md hover:bg-gray-800 ${currentPath === '/directsearch' ? 'active bg-gray-800' : ''}">
              <i class="fas fa-bolt w-6"></i>
              <span>Direct Search</span>
            </a>
          </li>
          <li>
            <a href="/downloads" class="sidebar-link flex items-center p-2 rounded-md hover:bg-gray-800 ${currentPath === '/downloads' ? 'active bg-gray-800' : ''}">
              <i class="fas fa-download w-6"></i>
              <span>Downloads</span>
            </a>
          </li>
          <li>
            <a href="/settings" class="sidebar-link flex items-center p-2 rounded-md hover:bg-gray-800 ${currentPath === '/settings' ? 'active bg-gray-800' : ''}">
              <i class="fas fa-user-cog w-6"></i>
              <span>Settings</span>
            </a>
          </li>
          ${isAdmin ? `
          <li class="pt-4 border-t border-gray-800 mt-4">
            <span class="text-xs text-gray-500 uppercase">Admin</span>
          </li>
          <li>
            <a href="/users" class="sidebar-link flex items-center p-2 rounded-md hover:bg-gray-800 ${currentPath === '/users' ? 'active bg-gray-800' : ''}">
              <i class="fas fa-users w-6"></i>
              <span>Users</span>
            </a>
          </li>
          <li>
            <a href="/logs" class="sidebar-link flex items-center p-2 rounded-md hover:bg-gray-800 ${currentPath === '/logs' ? 'active bg-gray-800' : ''}">
              <i class="fas fa-list w-6"></i>
              <span>Logs</span>
            </a>
          </li>
          <li>
            <a href="/serversettings" class="sidebar-link flex items-center p-2 rounded-md hover:bg-gray-800 ${currentPath === '/serversettings' ? 'active bg-gray-800' : ''}">
              <i class="fas fa-cog w-6"></i>
              <span>Server Settings</span>
            </a>
          </li>
          ` : ''}
        </ul>
      </nav>
    </div>

    <div class="sidebar-footer p-4 border-t border-gray-800 absolute bottom-0 w-full">
      <button id="logout-btn" class="flex items-center p-2 rounded-md hover:bg-gray-800 w-full">
        <i class="fas fa-sign-out-alt w-6"></i>
        <span>Logout</span>
      </button>
    </div>

    <!-- Mobile toggle button (only shown if no existing toggle button) -->
    <button id="sidebar-toggle" class="md:hidden fixed top-4 left-4 z-60 bg-gray-900 text-white p-2 rounded-md hidden">
      <i class="fas fa-bars"></i>
    </button>
  `;

  // Add event listener to logout button
  document.getElementById('logout-btn').addEventListener('click', () => {
    fetch('/api/auth/logout', {
      method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        window.location.href = '/login';
      }
    });
  });

  // Add event listener to mobile toggle button
  const toggleBtn = document.getElementById('sidebar-toggle');

  // Check if there are existing toggle buttons in the layout
  const existingToggleBtns = document.querySelectorAll('.mobile-menu-toggle');

  if (existingToggleBtns.length === 0 && toggleBtn) {
    // No existing toggle buttons, show our custom one
    toggleBtn.classList.remove('hidden');
    toggleBtn.addEventListener('click', () => {
      // Use the global toggleSidebar function if available, otherwise toggle directly
      if (window.toggleSidebar) {
        window.toggleSidebar();
      } else {
        // Just toggle the open class, CSS will handle the positioning
        sidebar.classList.toggle('open');

        // Toggle overlay
        const overlay = document.querySelector('.mobile-menu-overlay');
        if (overlay) {
          overlay.classList.toggle('open');
        }

        // Toggle body class
        document.body.classList.toggle('overflow-hidden');
      }
    });
  }
  // We don't need to add event listeners to existing toggle buttons
  // They already have onclick handlers from topbar.js

  // Function to close the sidebar
  const closeSidebar = () => {
    sidebar.classList.remove('open');

    // Hide overlay
    const overlay = document.querySelector('.mobile-menu-overlay');
    if (overlay) {
      overlay.classList.remove('open');
    }

    // Remove body class
    document.body.classList.remove('overflow-hidden');

    console.log('Sidebar closed');
  };

  // Add event listener to close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 768 &&
        !sidebar.contains(e.target) &&
        e.target !== toggleBtn &&
        !e.target.closest('.mobile-menu-toggle')) {
      closeSidebar();
    }
  });

  // Add event listeners to any existing close buttons
  const closeButtons = document.querySelectorAll('.mobile-menu-close');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeSidebar);
  });

  // Add CSS for active link
  const style = document.createElement('style');
  style.textContent = `
    .sidebar-link.active {
      color: #f56565;
      font-weight: bold;
    }

    /* We don't need to add margin to body since the layout already handles it */
  `;
  document.head.appendChild(style);
}

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', initSidebar);
