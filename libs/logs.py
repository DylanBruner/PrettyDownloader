import os
import json
import datetime
from datetime import timedelta
from flask import session

# Path to the logs database file
LOGS_DB_PATH = os.environ.get('LOGS_DB_PATH', 'logs.json')

def init_logs_db():
    """Initialize the logs database if it doesn't exist"""
    # Ensure the directory exists if path contains directories
    if os.path.dirname(LOGS_DB_PATH):
        os.makedirs(os.path.dirname(LOGS_DB_PATH), exist_ok=True)

    if not os.path.exists(LOGS_DB_PATH):
        with open(LOGS_DB_PATH, 'w') as f:
            json.dump({"logs": []}, f)
        print("[INFO] Created new logs database at", LOGS_DB_PATH)

def is_log_older_than_days(log_timestamp, days=7):
    """Check if a log is older than the specified number of days

    Args:
        log_timestamp (str): ISO format timestamp string
        days (int): Number of days threshold

    Returns:
        bool: True if the log is older than the specified days
    """
    try:
        log_date = datetime.datetime.fromisoformat(log_timestamp)
        cutoff_date = datetime.datetime.now() - timedelta(days=days)
        return log_date < cutoff_date
    except Exception as e:
        print(f"[ERROR] Error parsing timestamp: {e}")
        return False

def purge_old_logs(logs_data, days=7):
    """Remove logs older than the specified number of days

    Args:
        logs_data (dict): The logs data dictionary
        days (int): Number of days to keep logs for

    Returns:
        dict: The updated logs data with old logs removed
    """
    if 'logs' not in logs_data:
        return {"logs": []}

    # Filter out logs older than the specified days
    current_logs = logs_data['logs']
    filtered_logs = [log for log in current_logs if not is_log_older_than_days(log['timestamp'], days)]

    # Count removed logs
    removed_count = len(current_logs) - len(filtered_logs)
    if removed_count > 0:
        print(f"[INFO] Purged {removed_count} logs older than {days} days")

    return {"logs": filtered_logs}

def get_logs():
    """Get all logs from the database and purge old logs"""
    if not os.path.exists(LOGS_DB_PATH):
        print(f"[INFO] Logs file does not exist, initializing")
        init_logs_db()

    try:
        with open(LOGS_DB_PATH, 'r') as f:
            data = json.load(f)

            # Purge logs older than 7 days
            data = purge_old_logs(data)

            # Save the purged logs back to the file
            save_logs(data)

            return data
    except Exception as e:
        print(f"[ERROR] Failed to load logs: {e}")
        return {"logs": []}

def save_logs(logs_data):
    """Save logs data to the database"""
    with open(LOGS_DB_PATH, 'w') as f:
        json.dump(logs_data, f, indent=2)

def add_log(log_type, username, details=None):
    """Add a new log entry

    Args:
        log_type (str): Type of log ('login', 'login_failed', 'download', etc.)
        username (str): Username associated with the action
        details (dict, optional): Additional details about the action
    """
    logs_data = get_logs()

    # Create log entry
    log_entry = {
        'timestamp': datetime.datetime.now().isoformat(),
        'type': log_type,
        'username': username,
        'details': details or {}
    }

    # Add to logs
    logs_data['logs'].append(log_entry)

    # Save logs
    save_logs(logs_data)

    print(f"[INFO] Added log: {log_type} by {username}")
    return True

def log_login_attempt(username, success):
    """Log a login attempt

    Args:
        username (str): Username that attempted to login
        success (bool): Whether the login was successful
    """
    log_type = 'login' if success else 'login_failed'
    return add_log(log_type, username, {'success': success})

def log_download(username, torrent_name, torrent_hash, download_path):
    """Log a download

    Args:
        username (str): Username that initiated the download
        torrent_name (str): Name of the torrent
        torrent_hash (str): Hash of the torrent
        download_path (str): Path where the torrent is being downloaded
    """
    details = {
        'torrent_name': torrent_name,
        'torrent_hash': torrent_hash,
        'download_path': download_path
    }
    return add_log('download', username, details)

def log_download_failed(username, torrent_name, torrent_hash, reason):
    """Log a failed download

    Args:
        username (str): Username that attempted the download
        torrent_name (str): Name of the torrent
        torrent_hash (str): Hash of the torrent
        reason (str): Reason for the failure
    """
    details = {
        'torrent_name': torrent_name,
        'torrent_hash': torrent_hash,
        'reason': reason
    }
    return add_log('download_failed', username, details)

def log_quota_exceeded(username, quota_type, limit, used):
    """Log a quota exceeded event

    Args:
        username (str): Username that exceeded the quota
        quota_type (str): Type of quota ('daily', 'weekly', 'monthly')
        limit (int): Quota limit
        used (int): Current usage
    """
    details = {
        'quota_type': quota_type,
        'limit': limit,
        'used': used
    }
    return add_log('quota_exceeded', username, details)

def log_user_created(admin_username, created_username, is_admin):
    """Log user creation

    Args:
        admin_username (str): Username of the admin who created the user
        created_username (str): Username of the created user
        is_admin (bool): Whether the created user is an admin
    """
    details = {
        'created_username': created_username,
        'is_admin': is_admin
    }
    return add_log('user_created', admin_username, details)

def log_user_deleted(admin_username, deleted_username):
    """Log user deletion

    Args:
        admin_username (str): Username of the admin who deleted the user
        deleted_username (str): Username of the deleted user
    """
    details = {
        'deleted_username': deleted_username
    }
    return add_log('user_deleted', admin_username, details)

def log_user_suspended(admin_username, suspended_username):
    """Log user suspension

    Args:
        admin_username (str): Username of the admin who suspended the user
        suspended_username (str): Username of the suspended user
    """
    details = {
        'suspended_username': suspended_username
    }
    return add_log('user_suspended', admin_username, details)

def log_user_unsuspended(admin_username, unsuspended_username):
    """Log user unsuspension

    Args:
        admin_username (str): Username of the admin who unsuspended the user
        unsuspended_username (str): Username of the unsuspended user
    """
    details = {
        'unsuspended_username': unsuspended_username
    }
    return add_log('user_unsuspended', admin_username, details)

def log_user_registered(username):
    """Log user self-registration

    Args:
        username (str): Username of the registered user
    """
    return add_log('user_registered', username)

def log_user_approved(admin_username, approved_username):
    """Log user approval

    Args:
        admin_username (str): Username of the admin who approved the user
        approved_username (str): Username of the approved user
    """
    details = {
        'approved_username': approved_username
    }
    return add_log('user_approved', admin_username, details)

def log_user_rejected(admin_username, rejected_username):
    """Log user rejection

    Args:
        admin_username (str): Username of the admin who rejected the user
        rejected_username (str): Username of the rejected user
    """
    details = {
        'rejected_username': rejected_username
    }
    return add_log('user_rejected', admin_username, details)

def log_event(username, event_type, message):
    """Log a generic event

    Args:
        username (str): Username associated with the event
        event_type (str): Type of event
        message (str): Event message or details
    """
    details = {
        'message': message
    }
    return add_log(event_type, username, details)

def get_filtered_logs(log_type=None, username=None, limit=100):
    """Get logs filtered by type and/or username

    Args:
        log_type (str, optional): Type of logs to filter by
        username (str, optional): Username to filter by
        limit (int, optional): Maximum number of logs to return

    Returns:
        list: Filtered logs
    """
    logs_data = get_logs()
    logs = logs_data['logs']

    # Sort logs by timestamp (newest first)
    logs.sort(key=lambda x: x['timestamp'], reverse=True)

    # Apply filters
    if log_type:
        logs = [log for log in logs if log['type'] == log_type]

    if username:
        logs = [log for log in logs if log['username'] == username]

    # Apply limit
    logs = logs[:limit]

    return logs
