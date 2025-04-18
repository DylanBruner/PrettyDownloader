# PrettyDownloader

PrettyDownloader is a web-based torrent search and download manager that integrates with qBittorrent to provide a clean, user-friendly interface for searching and managing torrent downloads.

![PrettyDownloader](static/img/favicon.png)

## Features

- **Torrent Search**: Search for torrents using The Pirate Bay API
- **Download Management**: Start, monitor, and delete torrent downloads
- **User Authentication**: Secure login system with hashed passwords
- **User Management**: Admin interface for creating, editing, and deleting users
- **Logging System**: Track downloads, login attempts, and user management actions
- **Settings Management**: Configure qBittorrent connection details through a web interface
- **Responsive Design**: Mobile-friendly interface with a clean, modern look
- **Docker Support**: Easy deployment using Docker and Docker Compose

## Installation

### Prerequisites

- Python 3.9 or higher
- qBittorrent with Web UI enabled
- Docker and Docker Compose (for containerized deployment)

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/PrettyDownloader.git
   cd PrettyDownloader
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your qBittorrent connection details:
   ```
   qb-url = "http://localhost:8080/"
   qb-user = "admin"
   qb-password = "adminadmin"
   ```

4. Run the application:
   ```bash
   python server.py
   ```

5. Access the application at http://localhost:80

### Docker Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/PrettyDownloader.git
   cd PrettyDownloader
   ```

2. Build and run the Docker container:
   ```bash
   docker-compose up -d
   ```

3. Access the application at http://localhost:8080

## Usage

### Authentication

The application uses a simple authentication system. On first run, a default admin user is created:
- Username: `admin`
- Password: `admin`

For security reasons, you should change this password after the first login.

### Search for Torrents

1. Log in to the application
2. Use the search bar on the home page to search for torrents
3. Browse through the search results
4. Click the download button next to a torrent to start downloading

### Manage Downloads

1. Navigate to the Downloads page
2. View the status of your current downloads
3. Delete torrents and their files as needed

### User Management (Admin Only)

1. Navigate to the Users page
2. Create new users
3. Toggle admin status for users
4. Delete users
5. Change user passwords

### View Logs (Admin Only)

1. Navigate to the Logs page
2. View logs of downloads, login attempts, and user management actions
3. Filter logs by type or username

### Configure Settings (Admin Only)

1. Navigate to the Settings page
2. Configure qBittorrent connection details
3. Enable or disable qBittorrent integration

## Configuration

### Environment Variables

The following environment variables can be set in the `.env` file or through Docker environment variables:

- `qb-url`: URL to your qBittorrent Web UI (e.g., http://localhost:8080/)
- `qb-user`: qBittorrent username
- `qb-password`: qBittorrent password
- `disable-qb`: Set to "true" to disable qBittorrent integration
- `DATA_DIR`: Directory to store all JSON database files (default: "data")

Alternatively, you can set individual database file paths (these override the DATA_DIR setting):
- `USERS_DB_PATH`: Path to the users database file
- `LOGS_DB_PATH`: Path to the logs database file
- `SETTINGS_DB_PATH`: Path to the settings database file
- `DOWNLOADS_DB_PATH`: Path to the downloads database file
- `PASSKEYS_DB_PATH`: Path to the passkeys database file
- `INVITES_DB_PATH`: Path to the invites database file

### Web Interface Settings

Settings can also be configured through the web interface. These settings override the values in the `.env` file.

## Deployment

### Docker Deployment

See the [DEPLOYMENT.md](DEPLOYMENT.md) file for detailed instructions on deploying PrettyDownloader using Docker.

### Portainer Deployment

A `docker-compose.portainer.yml` file is provided for easy deployment to Portainer:

1. Upload the `docker-compose.portainer.yml` file to your Portainer instance
2. Create a new stack using this file
3. Configure the environment variables as needed
4. Deploy the stack

## Security Considerations

- Change the default admin password immediately after installation
- Use HTTPS if deploying to a public server
- Regularly check the logs for suspicious activity
- Keep the application and its dependencies updated

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [The Pirate Bay API](https://apibay.org) for torrent search functionality
- [qBittorrent](https://www.qbittorrent.org/) for download management
- [Flask](https://flask.palletsprojects.com/) for the web framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
