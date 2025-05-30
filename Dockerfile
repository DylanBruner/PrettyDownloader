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
COPY libs/ ./libs/
COPY static/ ./static/

# Create directories for persistent data
RUN mkdir -p flask_session
RUN mkdir -p /data

# Set the data directory environment variable
ENV DATA_DIR=/data

# Create .env file - these will be overridden by environment variables
RUN echo "# QB Config\nqb-url = \"http://host.docker.internal:30024/\"\nqb-user=\"admin\"\nqb-password=\"adminadmin\"" > .env

# Expose port
EXPOSE 80

# Run the application
CMD ["python", "server.py"]
