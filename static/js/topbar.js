/**
 * Creates and initializes the top navigation bar
 * This function should be called on every page to ensure consistent navigation
 */
function initTopbar() {
  // Get the current page title
  const currentPath = window.location.pathname;
  let pageTitle = 'PrettyDownloader';

  // Set page title based on current path
  switch (currentPath) {
    case '/':
      pageTitle = 'Search';
      break;
    case '/downloads':
      pageTitle = 'Downloads';
      break;
    case '/settings':
      pageTitle = 'User Settings';
      break;
    case '/users':
      pageTitle = 'User Management';
      break;
    case '/logs':
      pageTitle = 'Logs';
      break;
    case '/dashboard':
      pageTitle = 'User Activity Dashboard';
      break;
    case '/serversettings':
      pageTitle = 'Server Settings';
      break;
    default:
      pageTitle = 'PrettyDownloader';
  }

  // Don't show topbar on login page
  if (currentPath === '/login') {
    return;
  }

  // Create topbar
  createTopbar(pageTitle);
}

/**
 * Creates the top navigation bar with the appropriate title
 * @param {string} pageTitle - The title of the current page
 */
function createTopbar(pageTitle) {
  // Check if topbar already exists
  let topbar = document.getElementById('topbar');

  if (!topbar) {
    // Find the main content container
    const mainContent = document.querySelector('.flex-1.ml-0.md\\:ml-64') ||
                        document.querySelector('main') ||
                        document.body.firstElementChild;

    if (!mainContent) {
      console.error('Could not find main content container for topbar');
      return;
    }

    // Create topbar element
    topbar = document.createElement('header');
    topbar.id = 'topbar';
    topbar.className = 'bg-gray-800 shadow-md p-4 flex items-center justify-between';

    // Create topbar content
    topbar.innerHTML = `
      <div class="flex items-center">
        <button class="mobile-menu-toggle md:hidden mr-4 text-gray-400 hover:text-white" onclick="toggleMobileMenu(); return false;">
          <i class="fas fa-bars" onclick="toggleMobileMenu(); event.stopPropagation(); return false;"></i>
        </button>
        <h1 class="text-xl font-semibold">${pageTitle}</h1>
      </div>
      <div class="flex items-center">
        <span id="user-display" class="text-sm"></span>
      </div>
    `;

    // Add global function for inline event handler
    window.toggleSidebar = function() {
      console.log('toggleSidebar called from inline handler');
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.toggle('open');
        console.log('Toggled sidebar open class from inline handler, now:', sidebar.classList.contains('open'));

        const overlay = document.querySelector('.mobile-menu-overlay');
        if (overlay) {
          overlay.classList.toggle('open');
        }

        document.body.classList.toggle('overflow-hidden');

        // Prevent default action and stop propagation
        return false;
      }
    };

    // Insert topbar at the beginning of main content
    if (mainContent.firstChild) {
      mainContent.insertBefore(topbar, mainContent.firstChild);
    } else {
      mainContent.appendChild(topbar);
    }

    // We're using the inline onclick handler now, so no need for this event listener
    // The global toggleSidebar function will handle the sidebar toggle

    // Display username if available
    fetch('/api/auth/status')
      .then(response => response.json())
      .then(data => {
        if (data.authenticated) {
          const userDisplay = document.getElementById('user-display');
          if (userDisplay) {
            userDisplay.textContent = data.username;
          }
        }
      })
      .catch(error => {
        console.error('Error fetching auth status:', error);
      });
  }
}

// Define global toggleSidebar function immediately
window.toggleSidebar = window.toggleSidebar || function() {
  console.log('toggleSidebar called (global function)');
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
    console.log('Toggled sidebar open class, now:', sidebar.classList.contains('open'));

    const overlay = document.querySelector('.mobile-menu-overlay');
    if (overlay) {
      overlay.classList.toggle('open');
    }

    document.body.classList.toggle('overflow-hidden');

    // Prevent default action and stop propagation
    return false;
  }
};

// Initialize topbar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired in topbar.js');
  initTopbar();
});
