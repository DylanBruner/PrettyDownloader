import os
import json
import dotenv
from flask import session

# Path to the settings database file
SETTINGS_DB_PATH = os.environ.get('SETTINGS_DB_PATH', 'settings.json')

def init_settings_db():
    """Initialize the settings database if it doesn't exist"""
    # Ensure the directory exists if path contains directories
    if os.path.dirname(SETTINGS_DB_PATH):
        os.makedirs(os.path.dirname(SETTINGS_DB_PATH), exist_ok=True)

    if not os.path.exists(SETTINGS_DB_PATH):
        with open(SETTINGS_DB_PATH, 'w') as f:
            json.dump({"settings": {}}, f)
        print("[INFO] Created new settings database at", SETTINGS_DB_PATH)

def get_settings_from_env():
    """Get all settings from the .env file"""
    # Load .env file
    dotenv.load_dotenv()

    # Get all settings from .env
    env_settings = {
        # qBittorrent settings
        "qb-url": os.environ.get("qb-url", ""),
        "qb-user": os.environ.get("qb-user", ""),
        "qb-password": os.environ.get("qb-password", ""),
        "disable-qb": os.environ.get("disable-qb", "false").lower() == "true",

        # TMDB API settings
        "tmdb-api-key": os.environ.get("tmdb-api-key", ""),

        # WebAuthn/Passkey settings
        "RP_ID": os.environ.get("RP_ID", "localhost"),
        "RP_NAME": os.environ.get("RP_NAME", "PrettyDownloader"),
        "RP_ORIGIN": os.environ.get("RP_ORIGIN", "http://localhost"),
        "auto-prompt-passkeys": os.environ.get("auto-prompt-passkeys", "true").lower() == "true",

        # Content filtering settings
        "hide-adult-content": os.environ.get("hide-adult-content", "true").lower() == "true",

        # Authentication token settings
        "ACCESS_TOKEN_EXPIRY": int(os.environ.get("ACCESS_TOKEN_EXPIRY", 15 * 60)),  # 15 minutes in seconds
        "REFRESH_TOKEN_EXPIRY": int(os.environ.get("REFRESH_TOKEN_EXPIRY", 30 * 24 * 60 * 60)),  # 30 days in seconds
        "SHORT_REFRESH_TOKEN_EXPIRY": int(os.environ.get("SHORT_REFRESH_TOKEN_EXPIRY", 24 * 60 * 60)),  # 1 day in seconds

        # Default user quotas
        "default-daily-quota": int(os.environ.get("default-daily-quota", 0)),  # 0 = unlimited
        "default-weekly-quota": int(os.environ.get("default-weekly-quota", 0)),  # 0 = unlimited
        "default-monthly-quota": int(os.environ.get("default-monthly-quota", 0)),  # 0 = unlimited

        # Provider settings
        "providers": {}
    }

    return env_settings

def get_overridden_settings():
    """Get all overridden settings from the settings database"""
    if not os.path.exists(SETTINGS_DB_PATH):
        print(f"[INFO] Settings file does not exist, initializing")
        init_settings_db()

    try:
        with open(SETTINGS_DB_PATH, 'r') as f:
            data = json.load(f)
            return data.get("settings", {})
    except Exception as e:
        print(f"[ERROR] Failed to load settings: {e}")
        return {}

def save_settings(settings_data):
    """Save settings data to the database"""
    # Ensure the settings database exists
    if not os.path.exists(SETTINGS_DB_PATH):
        init_settings_db()

    # Load current settings
    try:
        with open(SETTINGS_DB_PATH, 'r') as f:
            data = json.load(f)
    except Exception:
        data = {"settings": {}}

    # Update settings
    data["settings"] = settings_data

    # Save settings
    with open(SETTINGS_DB_PATH, 'w') as f:
        json.dump(data, f, indent=2)

    return True

def get_effective_settings():
    """Get effective settings (overridden or default)"""
    # Get settings from .env
    env_settings = get_settings_from_env()

    # Get overridden settings
    overridden_settings = get_overridden_settings()

    # Merge settings (overridden settings take precedence)
    effective_settings = {**env_settings, **overridden_settings}

    return effective_settings

def update_settings(new_settings):
    """Update settings with new values"""
    # Get current overridden settings
    current_settings = get_overridden_settings()

    # Update settings
    current_settings.update(new_settings)

    # Save settings
    success = save_settings(current_settings)

    return success

def apply_settings_to_env():
    """Apply effective settings to environment variables"""
    # Get effective settings
    effective_settings = get_effective_settings()

    # Apply settings to environment variables
    for key, value in effective_settings.items():
        if isinstance(value, bool):
            os.environ[key] = str(value).lower()
        else:
            os.environ[key] = str(value)

    return True
