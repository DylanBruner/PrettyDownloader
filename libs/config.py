import os
import json

# Global data directory for all JSON database files
# Default to 'data' directory in the current working directory
# This will be updated by settings.apply_settings_to_env() if DATA_DIR is set in settings
DATA_DIR = os.environ.get('DATA_DIR', 'data')

# Ensure the data directory exists
def ensure_data_dir():
    """Ensure the data directory exists"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
        print(f"[INFO] Created data directory at {DATA_DIR}")
    return DATA_DIR

# Get the full path for a database file
def get_db_path(filename, env_var=None):
    """
    Get the full path for a database file

    Args:
        filename (str): The filename for the database
        env_var (str, optional): Environment variable name to override the path

    Returns:
        str: The full path to the database file
    """
    # If an environment variable is specified and set, use that path
    if env_var and os.environ.get(env_var):
        path = os.environ.get(env_var)
        print(f"[INFO] Using path from environment variable {env_var}: {path}")

        # Ensure directory exists if path contains directories
        if os.path.dirname(path):
            os.makedirs(os.path.dirname(path), exist_ok=True)

        return path

    # Otherwise, use the data directory
    ensure_data_dir()
    return os.path.join(DATA_DIR, filename)

# Database paths
USERS_DB_PATH = get_db_path('users.json', 'USERS_DB_PATH')
LOGS_DB_PATH = get_db_path('logs.json', 'LOGS_DB_PATH')
SETTINGS_DB_PATH = get_db_path('settings.json', 'SETTINGS_DB_PATH')
PASSKEYS_DB_PATH = get_db_path('passkeys.json', 'PASSKEYS_DB_PATH')
DOWNLOADS_DB_PATH = get_db_path('downloads.json', 'DOWNLOADS_DB_PATH')
INVITES_DB_PATH = get_db_path('invites.json', 'INVITES_DB_PATH')

# Print database paths for debugging
print(f"[INFO] Database paths:")
print(f"  - Users: {USERS_DB_PATH}")
print(f"  - Logs: {LOGS_DB_PATH}")
print(f"  - Settings: {SETTINGS_DB_PATH}")
print(f"  - Passkeys: {PASSKEYS_DB_PATH}")
print(f"  - Downloads: {DOWNLOADS_DB_PATH}")
print(f"  - Invites: {INVITES_DB_PATH}")
