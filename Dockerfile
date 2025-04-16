FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install python-dotenv

# Copy application files
COPY server.py .

# Create libs directory and copy library files
RUN mkdir -p libs
COPY libs/users.py ./libs/
COPY libs/logs.py ./libs/
COPY libs/settings.py ./libs/
COPY libs/providers/ ./libs/providers/
COPY libs/passkeys.py ./libs/
COPY libs/tmdbclient.py ./libs/
COPY static/ ./static/

# Create directories for persistent data
RUN mkdir -p flask_session
RUN mkdir -p /data

# Create initial settings file
RUN echo '{"settings": {}}' > /data/settings.json

# Create .env file - these will be overridden by environment variables
RUN echo "# QB Config\nqb-url = \"http://host.docker.internal:30024/\"\nqb-user=\"admin\"\nqb-password=\"adminadmin\"" > .env

# Expose port
EXPOSE 80

# Run the application
CMD ["python", "server.py"]
