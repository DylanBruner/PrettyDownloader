import os
import json
import datetime

# Path to the downloads database file
DOWNLOADS_DB_PATH = os.environ.get('DOWNLOADS_DB_PATH', 'downloads.json')

def init_downloads_db():
    """Initialize the downloads database if it doesn't exist"""
    # Ensure the directory exists if path contains directories
    if os.path.dirname(DOWNLOADS_DB_PATH):
        os.makedirs(os.path.dirname(DOWNLOADS_DB_PATH), exist_ok=True)

    if not os.path.exists(DOWNLOADS_DB_PATH):
        with open(DOWNLOADS_DB_PATH, 'w') as f:
            json.dump({"downloads": []}, f)
        print("[INFO] Created new downloads database at", DOWNLOADS_DB_PATH)

def get_downloads():
    """Get all downloads from the database"""
    if not os.path.exists(DOWNLOADS_DB_PATH):
        print(f"[INFO] Downloads file does not exist, initializing")
        init_downloads_db()

    try:
        with open(DOWNLOADS_DB_PATH, 'r') as f:
            data = json.load(f)
            return data
    except Exception as e:
        print(f"[ERROR] Failed to load downloads: {e}")
        return {"downloads": []}

def save_downloads(downloads_data):
    """Save downloads data to the database"""
    with open(DOWNLOADS_DB_PATH, 'w') as f:
        json.dump(downloads_data, f, indent=2)

def add_download(username, torrent_hash, torrent_name, download_path):
    """Add a new download entry

    Args:
        username (str): Username that initiated the download
        torrent_hash (str): Hash of the torrent
        torrent_name (str): Name of the torrent
        download_path (str): Path where the torrent is being downloaded

    Returns:
        bool: True if successful, False otherwise
    """
    downloads_data = get_downloads()

    # Normalize the hash to uppercase for consistency
    if torrent_hash:
        torrent_hash = torrent_hash.upper()

    # Create download entry
    download_entry = {
        'timestamp': datetime.datetime.now().isoformat(),
        'username': username,
        'hash': torrent_hash,
        'name': torrent_name,
        'path': download_path
    }

    # Add to downloads
    downloads_data['downloads'].append(download_entry)

    # Save downloads
    save_downloads(downloads_data)

    print(f"[INFO] Added download: {torrent_name} by {username}")
    return True

def remove_download(torrent_hash):
    """Remove a download entry by hash

    Args:
        torrent_hash (str): Hash of the torrent to remove

    Returns:
        bool: True if successful, False otherwise
    """
    downloads_data = get_downloads()

    # Normalize the hash for case-insensitive comparison
    if torrent_hash:
        torrent_hash_upper = torrent_hash.upper()
        torrent_hash_lower = torrent_hash.lower()

    # Find and remove the download (case-insensitive)
    initial_count = len(downloads_data['downloads'])
    downloads_data['downloads'] = [d for d in downloads_data['downloads']
                                 if d['hash'].upper() != torrent_hash_upper
                                 and d['hash'].lower() != torrent_hash_lower]

    # Check if any downloads were removed
    if len(downloads_data['downloads']) < initial_count:
        # Save downloads
        save_downloads(downloads_data)
        print(f"[INFO] Removed download with hash: {torrent_hash}")
        return True

    print(f"[INFO] No download found with hash: {torrent_hash}")
    return False

def get_user_downloads(username):
    """Get all downloads for a specific user

    Args:
        username (str): Username to get downloads for

    Returns:
        list: List of downloads for the user
    """
    downloads_data = get_downloads()

    # Filter downloads by username
    user_downloads = [d for d in downloads_data['downloads'] if d['username'] == username]

    return user_downloads

def get_download_by_hash(torrent_hash):
    """Get a download entry by hash

    Args:
        torrent_hash (str): Hash of the torrent

    Returns:
        dict: Download entry or None if not found
    """
    downloads_data = get_downloads()

    # Normalize the hash for case-insensitive comparison
    if torrent_hash:
        torrent_hash_upper = torrent_hash.upper()
        torrent_hash_lower = torrent_hash.lower()

    # Find the download by hash (case-insensitive)
    for download in downloads_data['downloads']:
        if download['hash'].upper() == torrent_hash_upper or download['hash'].lower() == torrent_hash_lower:
            return download

    return None

def get_all_downloads():
    """Get all downloads

    Returns:
        list: List of all downloads
    """
    downloads_data = get_downloads()
    return downloads_data['downloads']

def is_download_older_than_days(download_timestamp, days=30):
    """Check if a download is older than the specified number of days

    Args:
        download_timestamp (str): ISO format timestamp string
        days (int): Number of days threshold

    Returns:
        bool: True if the download is older than the specified days
    """
    try:
        download_date = datetime.datetime.fromisoformat(download_timestamp)
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
        return download_date < cutoff_date
    except Exception as e:
        print(f"[ERROR] Error parsing timestamp: {e}")
        return False

def purge_old_downloads(days=30):
    """Remove downloads older than the specified number of days

    Args:
        days (int): Number of days to keep downloads for

    Returns:
        int: Number of downloads removed
    """
    downloads_data = get_downloads()
    initial_count = len(downloads_data['downloads'])

    # Filter out downloads older than the specified days
    downloads_data['downloads'] = [
        d for d in downloads_data['downloads']
        if not is_download_older_than_days(d['timestamp'], days)
    ]

    # Calculate how many were removed
    removed_count = initial_count - len(downloads_data['downloads'])

    # Only save if something was removed
    if removed_count > 0:
        save_downloads(downloads_data)
        print(f"[INFO] Purged {removed_count} downloads older than {days} days")

    return removed_count

def sync_with_qbittorrent(qb_hashes):
    """Synchronize downloads database with qBittorrent

    Removes downloads from the database that no longer exist in qBittorrent.
    This function should be called periodically to keep the database in sync.

    Args:
        qb_hashes (list): List of torrent hashes currently in qBittorrent

    Returns:
        int: Number of downloads removed from the database
    """
    downloads_data = get_downloads()
    initial_count = len(downloads_data['downloads'])

    # Convert all hashes to both upper and lower case for case-insensitive matching
    qb_hash_set = set()
    for h in qb_hashes:
        qb_hash_set.add(h.upper())
        qb_hash_set.add(h.lower())

    # Filter out downloads that no longer exist in qBittorrent
    downloads_data['downloads'] = [
        d for d in downloads_data['downloads']
        if d['hash'].upper() in qb_hash_set or d['hash'].lower() in qb_hash_set
    ]

    # Calculate how many were removed
    removed_count = initial_count - len(downloads_data['downloads'])

    # Only save if something was removed
    if removed_count > 0:
        save_downloads(downloads_data)
        print(f"[INFO] Removed {removed_count} stale downloads from database")

    return removed_count
