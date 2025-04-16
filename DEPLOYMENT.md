# Deployment Guide for PrettyDownloader

This guide will help you deploy PrettyDownloader to your Plex server.

## Local Testing

Before deploying to your Plex server, you can test the application locally using Docker:

1. Build and run the Docker container:
   ```bash
   docker-compose up -d
   ```

2. Access the application at http://localhost:8080

3. To stop the container:
   ```bash
   docker-compose down
   ```

## Deploying to Plex Server

### Prerequisites

- Docker and Docker Compose installed on your Plex server
- qBittorrent running on your Plex server or accessible from your Plex server

### Deployment Steps

1. Copy all application files to your Plex server:
   ```bash
   scp -r /path/to/PrettyDownloader user@plex-server:/destination/path
   ```

2. SSH into your Plex server:
   ```bash
   ssh user@plex-server
   ```

3. Navigate to the application directory:
   ```bash
   cd /destination/path/PrettyDownloader
   ```

4. Edit the docker-compose.yml file to update the qBittorrent connection details:
   ```bash
   nano docker-compose.yml
   ```

   Update the following environment variables:
   - `qb-url`: URL to your qBittorrent Web UI (e.g., http://localhost:8080/)
   - `qb-user`: qBittorrent username
   - `qb-password`: qBittorrent password

5. Build and start the container:
   ```bash
   docker-compose up -d
   ```

6. Access the application at http://plex-server-ip:8080

### Configuration Options

You can modify the docker-compose.yml file to change various settings:

- **Port**: Change the port mapping (e.g., "9000:80" to use port 9000)
- **Volumes**: Add additional volumes for media directories if needed
- **Restart Policy**: The default is "unless-stopped", but you can change it to "always" or "on-failure"

### Authentication

The application uses a simple authentication system with hashed passwords. By default, a user with the following credentials is created:

- Username: `admin`
- Password: `admin`

For security reasons, you should change this password after the first login. You can modify the users.json file directly, but make sure to hash the passwords properly.

The users database is stored in the `users.json` file, which is mounted as a volume in the Docker container. This ensures that user data persists across container restarts.

### Updating the Application

To update the application:

1. Pull the latest code or make your changes
2. Rebuild and restart the container:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Troubleshooting

- **Connection Issues**: If the application can't connect to qBittorrent, check that the URL, username, and password are correct. If qBittorrent is running on the same host, you may need to use `host.docker.internal` instead of `localhost` in the URL.

- **Permission Issues**: If you encounter permission issues with download directories, make sure the container has proper access to the mounted volumes.

- **Logs**: View container logs for troubleshooting:
   ```bash
   docker-compose logs -f
   ```
