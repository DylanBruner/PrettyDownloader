# PrettyDownloader

PrettyDownloader is a web-based torrent search and download manager with a modern, responsive interface. It integrates with qBittorrent for torrent management and TMDB for media information, providing a seamless experience for finding and downloading movies, TV shows, and other content.

![PrettyDownloader](static/img/icon-192x192.png)

## Features

### Search and Media Integration
- **TMDB Integration**: Search for movies and TV shows with rich metadata and images
- **Multiple Torrent Providers**: Search across various torrent providers simultaneously
- **Direct Search**: Skip TMDB and search torrent providers directly with advanced filtering
- **Metadata Extraction**: Automatically extracts quality, season, episode, and year information from torrent names
- **Content Filtering**: Option to hide adult content in search results

### Download Management
- **qBittorrent Integration**: Seamlessly download torrents to your qBittorrent client
- **Download Path Selection**: Automatically select appropriate download paths based on content type
- **Multi-torrent Selection**: Select and download multiple torrents at once
- **Download Tracking**: Associate downloads with users and track download history
- **Torrent Management**: Remove torrents from seeding while keeping downloaded files

### User Management
- **Authentication**: Secure login with hashed passwords and token-based authentication
- **Passkey Support**: WebAuthn/passkey authentication for passwordless login
- **User Roles**: Admin, regular, and readonly user permissions
- **User Quotas**: Daily, weekly, and monthly download limits for users
- **Invitation System**: Invite-only registration with admin approval option
- **User Suspension**: Temporarily suspend users without deleting them

### Progressive Web App
- **Installable**: Install as a standalone app on mobile and desktop devices
- **Responsive Design**: Optimized for both desktop and mobile viewing
- **Offline Support**: Service worker for caching content where possible

### Administration
- **Server Settings**: Configure application settings through the web interface
- **User Management**: Create, edit, and manage users with different permission levels
- **Activity Logs**: Track login attempts, downloads, and user management events
- **Provider Management**: Enable/disable and configure torrent providers

## Installation

### Prerequisites
- Python 3.9 or higher
- qBittorrent with Web UI enabled
- Docker (optional, for containerized deployment)

### Local Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/PrettyDownloader.git
   cd PrettyDownloader
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your configuration:
   ```
   # qBittorrent Configuration
   qb-url = "http://localhost:8080/"
   qb-user = "admin"
   qb-password = "adminadmin"

   # TMDB API Key (optional)
   tmdb-api-key = "your_tmdb_api_key"

   # Data Directory
   DATA_DIR = "data"
   ```

4. Run the application:
   ```bash
   python server.py
   ```

5. Access the application at http://localhost:80

### Docker Installation

1. Build the Docker image:
   ```bash
   docker build -t prettydownloader:latest .
   ```

2. Run the container:
   ```bash
   docker run -d -p 8080:80 \
     -e qb-url="http://host.docker.internal:8080/" \
     -e qb-user="admin" \
     -e qb-password="adminadmin" \
     -e tmdb-api-key="your_tmdb_api_key" \
     -v /path/to/data:/data \
     --name prettydownloader \
     prettydownloader:latest
   ```

3. Access the application at http://localhost:8080

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `qb-url` | URL to qBittorrent Web UI | `http://localhost:8080/` |
| `qb-user` | qBittorrent username | `admin` |
| `qb-password` | qBittorrent password | `adminadmin` |
| `disable-qb` | Disable qBittorrent integration | `false` |
| `tmdb-api-key` | TMDB API key for media information | `""` |
| `DATA_DIR` | Directory to store all JSON database files | `data` |
| `RP_ID` | Relying Party ID for WebAuthn/passkeys | `localhost` |
| `RP_NAME` | Relying Party name for WebAuthn/passkeys | `PrettyDownloader` |
| `RP_ORIGIN` | Relying Party origin for WebAuthn/passkeys | `http://localhost` |
| `auto-prompt-passkeys` | Auto-prompt for passkey login | `true` |
| `hide-adult-content` | Filter out adult content from search results | `true` |

### Server Settings

All environment variables can also be configured through the Server Settings page in the web interface. Settings configured through the web interface override the values in the `.env` file.

## Usage

### Initial Login

The default admin credentials are:
- Username: `admin`
- Password: `admin`

For security reasons, change the default password after the first login.

### Adding Users

1. Navigate to the Users page (admin only)
2. Click "Add User"
3. Fill in the username, password, and quota settings
4. Choose the user role (admin, regular, or readonly)
5. Click "Create User"

### Searching for Content

1. Enter a search term in the search box
2. Select the media type filter (All, Movies, TV Shows)
3. Click "Search"
4. Click on a search result to view available torrents
5. Select torrents to download and click "Download Selected"

### Direct Search

1. Navigate to the Direct Search page
2. Enter a search term
3. Apply filters as needed (quality, year, etc.)
4. Select torrents to download and click "Download Selected"

### Managing Downloads

1. Navigate to the Downloads page
2. View all your downloads (admins can see all users' downloads)
3. Use the action menu to manage torrents (delete, remove from seeding, etc.)

## Documentation

### Provider System

PrettyDownloader uses a modular provider system that allows for easy integration of different torrent sources. The system is designed to be extensible, making it simple to add new torrent providers without modifying the core application code.

Key features:
- Abstract base class defining the provider interface
- Provider manager for registering and managing providers
- Ability to enable/disable providers through the UI
- Standardized search result format
- Filtering and sorting of combined results

For detailed information on implementing new providers, see the [Provider System Documentation](PROVIDER_SYSTEM.md).

### Deployment

- [Deployment Guide](DEPLOYMENT.md): Guide for deploying PrettyDownloader to your server

## Development

### Project Structure

- `server.py`: Main Flask application
- `libs/`: Library modules
  - `providers/`: Torrent provider implementations
  - `tmdbclient.py`: TMDB API client
  - `users.py`: User management
  - `downloads.py`: Download tracking
  - `passkeys.py`: WebAuthn/passkey implementation
  - `config.py`: Configuration management
  - `logs.py`: Logging system
  - `settings.py`: Settings management
  - `invites.py`: Invitation system
- `static/`: Static files (HTML, CSS, JS)
  - `js/`: JavaScript files
  - `css/`: CSS files
  - `img/`: Images and icons

### Adding a New Torrent Provider

1. Create a new provider class in `libs/providers/`
2. Implement the required methods (search, get_torrent_details, etc.)
3. Register the provider in `server.py`
4. See [Provider System](PROVIDER_SYSTEM.md) documentation for detailed instructions

## License

[MIT License](LICENSE)
