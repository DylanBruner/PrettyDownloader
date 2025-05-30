import os
import secrets
import requests
import json
import base64
import datetime
from flask import Flask, request, redirect, jsonify, session, Response
from flask_session import Session
from dotenv import load_dotenv
from libs.providers.provider_manager import ProviderManager
from libs.providers.piratebay_provider import PirateBayProvider
from libs.providers.sample_provider import SampleProvider
from libs.providers.yts_provider import YTSProvider
from libs.tmdbclient import TMDBClient
from qbittorrent import Client
import libs.config as config
import libs.users as users
import libs.logs as logs
import libs.settings as settings
import libs.passkeys as passkeys
import libs.tokens as tokens
import libs.downloads as downloads
import libs.invites as invites

# Custom JSON encoder to handle bytes objects
class BytesEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, bytes):
            return base64.b64encode(obj).decode('utf-8')
        return super().default(obj)

print("Loading..?")

load_dotenv()

# Global qBittorrent client
qbclient = None

# Function to ensure qBittorrent authentication is valid
def ensure_qb_auth():
    global qbclient
    if os.environ.get('disable-qb', '').lower() == 'true':
        return False

    try:
        # If qbclient is not initialized, create a new client
        if qbclient is None:
            qbclient = Client(os.environ['qb-url'])

        # Try to login (this will refresh the session if needed)
        qbclient.login(os.environ['qb-user'], os.environ['qb-password'])
        print("[INFO] Authenticated with qBittorrent")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to authenticate with qBittorrent: {e}")
        return False

# Initialize qBittorrent client
if not os.environ.get('disable-qb', '').lower() == 'true':
    ensure_qb_auth()
    print("[INFO] Connected to qbittorrent!")
    print(f"[INFO] Logging in with {os.environ['qb-user']} {os.environ['qb-password']} to {os.environ['qb-url']}")
else:
    print("[INFO] Disabling qbittorrent connection")
print("Loading..?")

# Initialize provider manager
provider_manager = ProviderManager()

# Register providers
piratebay_provider = PirateBayProvider()
provider_manager.register_provider("piratebay", piratebay_provider)

# Register sample provider (disabled by default)
sample_provider = SampleProvider()
provider_manager.register_provider("sample", sample_provider)

# Register YTS provider
yts_provider = YTSProvider()
provider_manager.register_provider("yts", yts_provider)


# Load provider settings from settings database
try:
    provider_settings = settings.get_effective_settings().get("providers", {})
    print(f"[INFO] Loaded provider settings: {provider_settings}")

    # Apply settings to providers
    for provider_id, provider_config in provider_settings.items():
        provider = provider_manager.get_provider(provider_id)
        if provider:
            if "enabled" in provider_config:
                provider.enabled = provider_config["enabled"]
                print(f"[INFO] Set provider {provider_id} enabled status to {provider.enabled}")
        else:
            print(f"[WARNING] Provider {provider_id} not found but has settings")
except Exception as e:
    print(f"[ERROR] Failed to load provider settings: {e}")

# Initialize TMDB client
tmdb = TMDBClient()

app = Flask(__name__)

# Configure Flask-Session
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_USE_SIGNER"] = True
app.config["SECRET_KEY"] = secrets.token_hex(16)  # Generate a random secret key
app.json_encoder = BytesEncoder  # Use custom JSON encoder for bytes objects
Session(app)

# Initialize data directory
try:
    config.ensure_data_dir()
    print(f"[INFO] Using data directory: {config.DATA_DIR}")
except Exception as e:
    print(f"[ERROR] Failed to initialize data directory: {e}")

# Initialize users database
try:
    users.init_users_db()
except Exception as e:
    print(f"[ERROR] Failed to initialize users database: {e}")

# Initialize logs database
try:
    logs.init_logs_db()
except Exception as e:
    print(f"[ERROR] Failed to initialize logs database: {e}")

# Initialize settings database
try:
    settings.init_settings_db()
    # Apply settings from .env and overrides
    settings.apply_settings_to_env()
    # Initialize token settings
    tokens.get_token_settings()
except Exception as e:
    print(f"[ERROR] Failed to initialize settings database: {e}")

# Initialize passkeys database
try:
    passkeys.init_passkeys_db()
except Exception as e:
    print(f"[ERROR] Failed to initialize passkeys database: {e}")

# Initialize downloads database
try:
    downloads.init_downloads_db()
except Exception as e:
    print(f"[ERROR] Failed to initialize downloads database: {e}")

# Initialize invites database
try:
    invites.init_invites_db()
except Exception as e:
    print(f"[ERROR] Failed to initialize invites database: {e}")

# Authentication middleware
def auth_required(func):
    def wrapper(*args, **kwargs):
        if not users.is_authenticated():
            return redirect("/login")
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

# Admin middleware
def admin_required(func):
    def wrapper(*args, **kwargs):
        print(f"[INFO] Admin middleware for {func.__name__}")
        if not users.is_authenticated():
            print("[INFO] User not authenticated, redirecting to login")
            return redirect("/login")

        is_admin = users.is_admin()
        print(f"[INFO] User is_admin check result: {is_admin}")

        if not is_admin:
            print("[INFO] User is not admin, returning 403")
            return jsonify({"success": False, "message": "Admin access required"}), 403

        print("[INFO] User is admin, proceeding")
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper

@app.route("/login")
def route_login():
    # If already logged in, redirect to home
    if users.is_authenticated():
        return redirect("/")

    with open("static/login.html", "r") as f:
        return f.read()

@app.route("/")
@auth_required
def route_index():
    with open("static/index.html", "r") as f:
        return f.read()

@app.route("/downloads")
@auth_required
def route_downloads():
    with open("static/downloads.html", "r") as f:
        return f.read()

@app.route("/users")
@auth_required
def route_users():
    # Check if user is admin
    if not users.is_admin():
        return redirect("/")

    with open("static/users.html", "r") as f:
        return f.read()

@app.route("/logs")
@auth_required
def route_logs():
    # Check if user is admin
    if not users.is_admin():
        return redirect("/")

    with open("static/logs.html", "r") as f:
        return f.read()

@app.route("/dashboard")
@auth_required
@admin_required
def route_dashboard():
    """Route for the user activity dashboard"""
    with open("static/dashboard.html", "r") as f:
        return f.read()

@app.route("/settings")
@auth_required
def route_settings():
    with open("static/settings.html", "r") as f:
        return f.read()

@app.route("/serversettings")
@auth_required
def route_serversettings():
    # Check if user is admin
    if not users.is_admin():
        return redirect("/")

    with open("static/serversettings.html", "r") as f:
        return f.read()

@app.route("/passkeys")
@auth_required
def route_passkeys():
    # Redirect to the new settings page
    return redirect("/settings")

@app.route("/directsearch")
@auth_required
def route_directsearch():
    with open("static/directsearch.html", "r") as f:
        return f.read()

@app.route("/static/<path:path>")
def route_static(path):
    return app.send_static_file(path)

# Authentication API routes
@app.route("/api/login", methods=["POST"])
def route_api_login():
    username = request.json.get("username")
    password = request.json.get("password")
    remember_me = request.json.get("remember_me", False)

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required"})

    # Check if user exists and get status
    is_valid, status_message = users.check_user_status(username)
    if not is_valid:
        # User exists but is suspended or pending approval
        if status_message:
            logs.log_login_attempt(username, False)
            return jsonify({"success": False, "message": status_message})

    if users.verify_user(username, password):
        # Generate tokens and login user
        auth_data = users.login_user(username, remember_me)

        # Log successful login
        logs.log_login_attempt(username, True)

        # Return tokens and user info
        return jsonify({
            "success": True,
            "access_token": auth_data["access_token"],
            "refresh_token": auth_data["refresh_token"],
            "expires_at": auth_data["expires_at"],
            "username": auth_data["username"],
            "is_admin": auth_data["is_admin"]
        })

    # Log failed login
    logs.log_login_attempt(username, False)
    return jsonify({"success": False, "message": "Invalid username or password"})

@app.route("/api/auth/status")
def route_api_auth_status():
    is_authenticated = users.is_authenticated()
    username = users.get_current_user() if is_authenticated else None
    is_admin = users.is_admin() if is_authenticated else False

    return jsonify({
        "authenticated": is_authenticated,
        "username": username,
        "is_admin": is_admin
    })

@app.route("/api/auth/refresh", methods=["POST"])
def route_api_auth_refresh():
    refresh_token = request.json.get("refresh_token")

    if not refresh_token:
        return jsonify({"success": False, "message": "Refresh token is required"}), 400

    # Generate new access token
    access_token, error = tokens.refresh_access_token(refresh_token)

    if error:
        return jsonify({"success": False, "message": error}), 401

    # Get user info
    username, _ = tokens.validate_refresh_token(refresh_token)
    is_admin = users.is_user_admin(username)

    return jsonify({
        "success": True,
        "access_token": access_token,
        "username": username,
        "is_admin": is_admin
    })

@app.route("/api/auth/logout", methods=["POST"])
def route_api_auth_logout():
    refresh_token = request.json.get("refresh_token")
    users.logout_user(refresh_token)
    return jsonify({"success": True})

# User management API routes
@app.route("/api/users")
@auth_required
@admin_required
def route_api_users_get():
    print("[INFO] API: Getting all users")
    try:
        all_users = users.get_all_users()
        print(f"[INFO] API: Found {len(all_users)} users")
        response = {
            "success": True,
            "users": all_users
        }
        print(f"[INFO] API: Returning response: {response}")
        return jsonify(response)
    except Exception as e:
        print(f"[ERROR] API: Error getting users: {e}")
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        })

@app.route("/api/users", methods=["POST"])
@auth_required
@admin_required
def route_api_users_create():
    print("[INFO] Creating new user")
    username = request.json.get("username")
    password = request.json.get("password")
    is_admin = request.json.get("is_admin", False)

    # Get quota settings from request or use defaults
    daily_quota = request.json.get("daily_quota")
    weekly_quota = request.json.get("weekly_quota")
    monthly_quota = request.json.get("monthly_quota")

    # If quotas not specified, use default settings
    if daily_quota is None:
        daily_quota = settings.get_effective_settings().get("default-daily-quota", 0)
    if weekly_quota is None:
        weekly_quota = settings.get_effective_settings().get("default-weekly-quota", 0)
    if monthly_quota is None:
        monthly_quota = settings.get_effective_settings().get("default-monthly-quota", 0)

    print(f"[INFO] New user data: username={username}, is_admin={is_admin}, quotas=[daily={daily_quota}, weekly={weekly_quota}, monthly={monthly_quota}]")

    if not username or not password:
        print("[ERROR] Username or password missing")
        return jsonify({"success": False, "message": "Username and password are required"})

    success, message = users.create_user(username, password, is_admin, daily_quota, weekly_quota, monthly_quota)
    print(f"[INFO] User creation result: success={success}, message={message}")

    # Log user creation if successful
    if success:
        admin_username = users.get_current_user()
        logs.log_user_created(admin_username, username, is_admin)

    return jsonify({"success": success, "message": message})

@app.route("/api/users/<username>", methods=["DELETE"])
@auth_required
@admin_required
def route_api_users_delete(username):
    success, message = users.delete_user(username)

    # Log user deletion if successful
    if success:
        admin_username = users.get_current_user()
        logs.log_user_deleted(admin_username, username)

    return jsonify({"success": success, "message": message})

@app.route("/api/users/<username>/toggle-admin", methods=["POST"])
@auth_required
@admin_required
def route_api_users_toggle_admin(username):
    success, message = users.toggle_admin(username)
    return jsonify({"success": success, "message": message})

@app.route("/api/users/<username>/change-password", methods=["POST"])
@auth_required
@admin_required
def route_api_users_change_password(username):
    print(f"[INFO] Admin changing password for user: {username}")
    new_password = request.json.get("new_password")

    if not new_password:
        print("[ERROR] New password is missing")
        return jsonify({"success": False, "message": "New password is required"})

    success, message = users.change_password(username, new_password)
    print(f"[INFO] Password change result: success={success}, message={message}")
    return jsonify({"success": success, "message": message})

@app.route("/api/users/self/change-password", methods=["POST"])
@auth_required
def route_api_users_change_own_password():
    print(f"[INFO] User changing own password")
    new_password = request.json.get("new_password")

    if not new_password:
        print("[ERROR] New password is missing")
        return jsonify({"success": False, "message": "New password is required"})

    # Get current username
    username = users.get_current_user()

    success, message = users.change_password(username, new_password)
    print(f"[INFO] Password change result: success={success}, message={message}")
    return jsonify({"success": success, "message": message})

@app.route("/api/users/<username>/quotas", methods=["GET"])
@auth_required
@admin_required
def route_api_users_get_quotas(username):
    print(f"[INFO] Getting quotas for user: {username}")
    quotas = users.get_user_quotas(username)

    if quotas:
        return jsonify({"success": True, "quotas": quotas})
    else:
        return jsonify({"success": False, "message": "User not found"}), 404

@app.route("/api/users/<username>/quotas", methods=["POST"])
@auth_required
@admin_required
def route_api_users_update_quotas(username):
    print(f"[INFO] Updating quotas for user: {username}")
    daily_quota = request.json.get("daily_quota")
    weekly_quota = request.json.get("weekly_quota")
    monthly_quota = request.json.get("monthly_quota")

    # Convert to integers if provided
    if daily_quota is not None:
        daily_quota = int(daily_quota)
    if weekly_quota is not None:
        weekly_quota = int(weekly_quota)
    if monthly_quota is not None:
        monthly_quota = int(monthly_quota)

    success, message = users.update_user_quotas(username, daily_quota, weekly_quota, monthly_quota)
    print(f"[INFO] Quota update result: success={success}, message={message}")
    return jsonify({"success": success, "message": message})

@app.route("/api/users/self/quotas", methods=["GET"])
@auth_required
def route_api_users_get_own_quotas():
    username = users.get_current_user()
    print(f"[INFO] Getting quotas for current user: {username}")
    quotas = users.get_user_quotas(username)

    if quotas:
        return jsonify({"success": True, "quotas": quotas})
    else:
        return jsonify({"success": False, "message": "User not found"}), 404

@app.route("/api/download", methods=["POST"])
@auth_required
def route_api_download():
    name = request.json.get("name")
    infohash = request.json.get("hash")
    downloadpath = request.json.get("path")
    provider_id = request.json.get("provider_id")
    current_user = users.get_current_user()

    # Check user quota limits
    quota_allowed, quota_message = users.check_quota_limits(current_user)
    if not quota_allowed:
        # Log failed download due to quota limit
        logs.log_download_failed(current_user, name, infohash, f"Quota limit exceeded: {quota_message}")
        return jsonify({"success": False, "message": quota_message}), 403

    # If provider_id is not specified, try to find a provider that can handle this infohash
    if not provider_id:
        # Try each enabled provider until one works
        for pid, provider in provider_manager.get_enabled_providers().items():
            magnet = provider.create_magnet_link(infohash, name)
            if magnet:
                provider_id = pid
                print(f"[INFO] Using provider {provider_id} for magnet link generation")
                break

        if not provider_id:
            return jsonify({"success": False, "message": "No enabled provider could create a magnet link"}), 400
    else:
        # Use the specified provider
        magnet = provider_manager.create_magnet_link(infohash, name, provider_id)
        if not magnet:
            return jsonify({"success": False, "message": f"Provider {provider_id} not found or disabled"}), 400

    print(f"[INFO] Created magnet link: {magnet} for {name} ({infohash}) using provider {provider_id}")

    # Ensure qBittorrent authentication is valid
    if os.environ.get('disable-qb', '').lower() == 'true':
        # Log failed download due to qBittorrent being disabled
        logs.log_download_failed(current_user, name, infohash, "qBittorrent is disabled")
        return jsonify({"success": False, "message": "qBittorrent is disabled"}), 503

    if not ensure_qb_auth():
        # Log failed download due to authentication failure
        logs.log_download_failed(current_user, name, infohash, "Failed to authenticate with qBittorrent")
        return jsonify({"success": False, "message": "Failed to authenticate with qBittorrent"}), 503

    try:
        resp = qbclient.download_from_link(magnet, savepath=downloadpath)
        print(f"[INFO] Started download for {name} ({infohash}) @ {downloadpath} response: {resp}")

        if resp == 'Ok.':
            # Increment user's download count
            users.increment_download_count(current_user)

            # Log successful download
            logs.log_download(current_user, name, infohash, downloadpath)

            # Store download in downloads database
            downloads.add_download(current_user, infohash, name, downloadpath)

            return jsonify({"success": True})
        # Log failed download due to qBittorrent error response
        logs.log_download_failed(current_user, name, infohash, f"qBittorrent error: {resp}")
        return jsonify({"success": False, "message": f"qBittorrent error: {resp}"})
    except Exception as e:
        print(f"[ERROR] Failed to download torrent: {str(e)}")
        # Log failed download due to exception
        logs.log_download_failed(current_user, name, infohash, f"Error: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route("/api/search", methods=["GET"])
@auth_required
def route_api_search():
    query = request.args.get("q")
    search_type = request.args.get("type", "tmdb")
    media_type = request.args.get("media_type", "all")
    provider_id = request.args.get("provider_id")  # If not specified, search all providers

    print(f"[INFO] Searching for {query} using {search_type}, media_type: {media_type}, provider: {provider_id if provider_id else 'all enabled providers'}")

    if search_type == "tmdb":
        # Search TMDB first with media type filter
        search_results = tmdb.search(query, media_type=media_type)
        return jsonify(search_results)
    else:
        # Direct torrent provider search (fallback)
        search_results = provider_manager.search(query, provider_id=provider_id)
        return jsonify(search_results)

@app.route('/api/tmdb/image/<path:image_path>')
@auth_required
def route_api_tmdb_image(image_path):
    """Proxy for TMDB images to avoid CORS issues"""
    try:
        # Construct the TMDB image URL
        tmdb_image_url = f"https://image.tmdb.org/t/p/w500/{image_path}"
        print(f"[INFO] Proxying TMDB image: {tmdb_image_url}")

        # Fetch the image
        response = requests.get(tmdb_image_url, stream=True)
        response.raise_for_status()

        # Return the image with appropriate headers
        return Response(
            response.raw.read(),
            content_type=response.headers['Content-Type'],
            headers={
                'Cache-Control': 'public, max-age=86400',  # Cache for 24 hours
            }
        )
    except Exception as e:
        print(f"[ERROR] Failed to proxy TMDB image: {e}")
        return jsonify({"success": False, "message": "Failed to load image"}), 404

@app.route('/api/tmdb/details', methods=["GET"])
@auth_required
def route_api_tmdb_details():
    media_id = request.args.get("id")
    media_type = request.args.get("type", "movie")

    if not media_id:
        return jsonify({"success": False, "message": "Media ID is required"}), 400

    print(f"[INFO] Getting TMDB details for {media_type} {media_id}")
    details = tmdb.get_details(media_id, media_type)

    if not details:
        return jsonify({"success": False, "message": "Failed to get details"}), 404

    return jsonify({"success": True, "details": details})

@app.route('/api/torrents', methods=["GET"])
@auth_required
def route_api_torrents():
    query = request.args.get("q")
    category = request.args.get("category", 0, type=int)
    provider_id = request.args.get("provider_id")  # If not specified, search all providers

    if not query:
        return jsonify({"success": False, "message": "Query is required"}), 400

    print(f"[INFO] Searching for {query} with category {category} using provider {provider_id if provider_id else 'all enabled providers'}")
    search_results = provider_manager.search(query, category, provider_id=provider_id)
    return jsonify(search_results)

@app.route('/api/fetch', methods=["GET"])
@auth_required
def route_api_fetch():
    # Ensure qBittorrent authentication is valid
    if os.environ.get('disable-qb', '').lower() == 'true':
        return jsonify({"success": False, "message": "qBittorrent is disabled"}), 503

    if not ensure_qb_auth():
        return jsonify({"success": False, "message": "Failed to authenticate with qBittorrent"}), 503

    try:
        # Get current user
        current_user = users.get_current_user()
        is_admin = users.is_admin()

        # Get all torrents from qBittorrent
        all_torrents = qbclient.torrents()

        # Synchronize downloads database with qBittorrent
        qb_hashes = [t['hash'] for t in all_torrents]
        removed_count = downloads.sync_with_qbittorrent(qb_hashes)
        if removed_count > 0:
            print(f"[INFO] Cleaned up {removed_count} stale downloads from database")

        # Purge old downloads (older than 30 days)
        purged_count = downloads.purge_old_downloads(days=30)
        if purged_count > 0:
            print(f"[INFO] Purged {purged_count} old downloads from database")

        # If user is not admin, filter torrents to only show their own
        if not is_admin:
            # Get user's downloads from our database
            user_downloads = downloads.get_user_downloads(current_user)

            # Create a set of hashes in both upper and lower case for case-insensitive matching
            user_hashes = set()
            for d in user_downloads:
                user_hashes.add(d['hash'].lower())
                user_hashes.add(d['hash'].upper())

            # Filter torrents to only include those with hashes in user_downloads
            filtered_torrents = [t for t in all_torrents if t['hash'] in user_hashes]
            return jsonify(filtered_torrents)
        else:
            # For admins, add username information to each torrent
            all_downloads = downloads.get_all_downloads()

            # Create a hash map with both uppercase and lowercase versions of the hash
            hash_to_user = {}
            for d in all_downloads:
                hash_to_user[d['hash'].lower()] = d['username']
                hash_to_user[d['hash'].upper()] = d['username']

            # Add username to each torrent if available
            for torrent in all_torrents:
                # Try to find the hash in our map (case insensitive)
                torrent_hash = torrent['hash']
                torrent['username'] = hash_to_user.get(torrent_hash, 'Unknown')

                # Debug output
                if torrent['username'] == 'Unknown':
                    print(f"[DEBUG] Could not find user for hash: {torrent_hash}")
                    print(f"[DEBUG] Available hashes: {list(hash_to_user.keys())}")

            return jsonify(all_torrents)
    except Exception as e:
        print(f"[ERROR] Failed to fetch torrents: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/delete', methods=["POST"])
@auth_required
def route_api_delete():
    hash_value = request.json.get("hash")
    delete_files = request.json.get("deleteFiles", False)
    keep_files = request.json.get("keepFiles", False)

    if not hash_value:
        return jsonify({"success": False, "message": "hash parameter is required"}), 400

    # Ensure qBittorrent authentication is valid
    if os.environ.get('disable-qb', '').lower() == 'true':
        return jsonify({"success": False, "message": "qBittorrent is disabled"}), 503

    if not ensure_qb_auth():
        return jsonify({"success": False, "message": "Failed to authenticate with qBittorrent"}), 503

    try:
        # Get current user for logging
        current_user = users.get_current_user()

        # Check if we have this download in our database before deleting
        download_info = downloads.get_download_by_hash(hash_value)
        if download_info:
            print(f"[INFO] Found download in database: {download_info['name']} by {download_info['username']}")
        else:
            print(f"[INFO] Download with hash {hash_value} not found in database")

        # Determine the action based on parameters
        action_description = ""
        if keep_files:
            # Remove torrent but keep files
            qbclient.delete(hash_value)
            action_description = "Removed torrent from seeding (kept files)"
            print(f"[INFO] Removed torrent {hash_value} from seeding (kept files)")
        else:
            # Delete torrent and optionally delete files
            qbclient.delete_permanently(hash_value)
            action_description = f"Deleted torrent and files"
            print(f"[INFO] Deleted torrent {hash_value} with delete_files={delete_files}")

        # Remove download from downloads database
        removed = downloads.remove_download(hash_value)
        if removed:
            print(f"[INFO] Successfully removed download with hash {hash_value} from database")
            # Log the deletion with appropriate action description
            logs.log_event(current_user, "download_deleted", f"{action_description} for {hash_value}")
        else:
            print(f"[WARNING] Failed to remove download with hash {hash_value} from database - not found")

        return jsonify({"success": True})
    except Exception as e:
        print(f"[ERROR] Failed to delete torrent {hash_value}: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/logs', methods=["GET"])
@auth_required
@admin_required
def route_api_logs():
    log_type = request.args.get("type")
    username = request.args.get("username")
    limit = request.args.get("limit", 100, type=int)

    try:
        # Get filtered logs
        filtered_logs = logs.get_filtered_logs(log_type, username, limit)

        # Calculate stats
        all_logs = logs.get_logs()["logs"]
        stats = {
            "total": len(all_logs),
            "downloads": len([log for log in all_logs if log["type"] == "download"]),
            "failed_downloads": len([log for log in all_logs if log["type"] == "download_failed"]),
            "logins": len([log for log in all_logs if log["type"] == "login"]),
            "failed_logins": len([log for log in all_logs if log["type"] == "login_failed"]),
            "user_created": len([log for log in all_logs if log["type"] == "user_created"]),
            "user_deleted": len([log for log in all_logs if log["type"] == "user_deleted"]),
            "quota_exceeded": len([log for log in all_logs if log["type"] == "quota_exceeded"])
        }

        return jsonify({
            "success": True,
            "logs": filtered_logs,
            "stats": stats
        })
    except Exception as e:
        print(f"[ERROR] Failed to fetch logs: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/dashboard/stats', methods=["GET"])
@auth_required
@admin_required
def route_api_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Get all users
        all_users = users.get_all_users()
        user_count = len(all_users)
        admin_count = sum(1 for user in all_users if user.get('is_admin', False))

        # Get all logs
        all_logs = logs.get_logs()["logs"]

        # Get all downloads
        all_downloads = downloads.get_all_downloads()

        # Calculate download stats
        download_count = len([log for log in all_logs if log["type"] == "download"])
        failed_download_count = len([log for log in all_logs if log["type"] == "download_failed"])

        # Calculate login stats
        login_count = len([log for log in all_logs if log["type"] == "login"])
        failed_login_count = len([log for log in all_logs if log["type"] == "login_failed"])

        # Get recent activity (last 24 hours)
        now = datetime.datetime.now()
        day_ago = now - datetime.timedelta(days=1)
        day_ago_iso = day_ago.isoformat()

        recent_logs = [log for log in all_logs if log["timestamp"] > day_ago_iso]
        recent_downloads = [log for log in recent_logs if log["type"] == "download"]
        recent_logins = [log for log in recent_logs if log["type"] == "login"]

        # Get active users (users with activity in the last 7 days)
        week_ago = now - datetime.timedelta(days=7)
        week_ago_iso = week_ago.isoformat()

        active_users = set()
        for log in all_logs:
            if log["timestamp"] > week_ago_iso:
                active_users.add(log["username"])

        # Calculate quota usage
        quota_stats = []
        for user in all_users:
            username = user['username']
            quotas = user.get('quotas', {})

            # Skip users without quotas
            if not quotas:
                continue

            daily = quotas.get('daily', {})
            weekly = quotas.get('weekly', {})
            monthly = quotas.get('monthly', {})

            # Only include users with quotas set
            if daily.get('limit', 0) > 0 or weekly.get('limit', 0) > 0 or monthly.get('limit', 0) > 0:
                quota_stats.append({
                    'username': username,
                    'daily': {
                        'used': daily.get('used', 0),
                        'limit': daily.get('limit', 0),
                        'percent': round(daily.get('used', 0) / daily.get('limit', 1) * 100) if daily.get('limit', 0) > 0 else 0
                    },
                    'weekly': {
                        'used': weekly.get('used', 0),
                        'limit': weekly.get('limit', 0),
                        'percent': round(weekly.get('used', 0) / weekly.get('limit', 1) * 100) if weekly.get('limit', 0) > 0 else 0
                    },
                    'monthly': {
                        'used': monthly.get('used', 0),
                        'limit': monthly.get('limit', 0),
                        'percent': round(monthly.get('used', 0) / monthly.get('limit', 1) * 100) if monthly.get('limit', 0) > 0 else 0
                    }
                })

        # Get download distribution by user
        user_downloads = {}
        for download in all_downloads:
            username = download['username']
            if username not in user_downloads:
                user_downloads[username] = 0
            user_downloads[username] += 1

        # Convert to list for easier consumption by frontend
        download_distribution = [{'username': username, 'count': count} for username, count in user_downloads.items()]
        download_distribution.sort(key=lambda x: x['count'], reverse=True)

        # Get recent downloads (last 10)
        recent_download_logs = [log for log in all_logs if log["type"] == "download"][:10]

        return jsonify({
            "success": True,
            "stats": {
                "users": {
                    "total": user_count,
                    "admins": admin_count,
                    "regular": user_count - admin_count,
                    "active": len(active_users)
                },
                "downloads": {
                    "total": download_count,
                    "failed": failed_download_count,
                    "recent": len(recent_downloads),
                    "distribution": download_distribution
                },
                "logins": {
                    "total": login_count,
                    "failed": failed_login_count,
                    "recent": len(recent_logins)
                },
                "quotas": quota_stats,
                "recent_activity": recent_download_logs
            }
        })
    except Exception as e:
        print(f"[ERROR] Failed to fetch dashboard stats: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/dashboard/activity', methods=["GET"])
@auth_required
@admin_required
def route_api_dashboard_activity():
    """Get user activity data for charts"""
    try:
        # Get time range from request (default to 7 days)
        days = request.args.get("days", 7, type=int)

        # Calculate date range
        now = datetime.datetime.now()
        start_date = now - datetime.timedelta(days=days)
        start_date_iso = start_date.isoformat()

        # Get all logs in the date range
        all_logs = logs.get_logs()["logs"]
        filtered_logs = [log for log in all_logs if log["timestamp"] > start_date_iso]

        # Group logs by day and type
        activity_by_day = {}

        for log in filtered_logs:
            # Parse timestamp and get date string (YYYY-MM-DD)
            log_date = datetime.datetime.fromisoformat(log["timestamp"]).strftime("%Y-%m-%d")
            log_type = log["type"]

            # Initialize day if not exists
            if log_date not in activity_by_day:
                activity_by_day[log_date] = {
                    "downloads": 0,
                    "logins": 0,
                    "failed_downloads": 0,
                    "failed_logins": 0,
                    "quota_exceeded": 0
                }

            # Increment counter for the log type
            if log_type == "download":
                activity_by_day[log_date]["downloads"] += 1
            elif log_type == "login":
                activity_by_day[log_date]["logins"] += 1
            elif log_type == "download_failed":
                activity_by_day[log_date]["failed_downloads"] += 1
            elif log_type == "login_failed":
                activity_by_day[log_date]["failed_logins"] += 1
            elif log_type == "quota_exceeded":
                activity_by_day[log_date]["quota_exceeded"] += 1

        # Ensure all days in the range have entries (fill gaps)
        date_list = []
        current_date = start_date
        while current_date <= now:
            date_str = current_date.strftime("%Y-%m-%d")
            date_list.append(date_str)

            # Initialize if not exists
            if date_str not in activity_by_day:
                activity_by_day[date_str] = {
                    "downloads": 0,
                    "logins": 0,
                    "failed_downloads": 0,
                    "failed_logins": 0,
                    "quota_exceeded": 0
                }

            current_date += datetime.timedelta(days=1)

        # Convert to list format for charts
        activity_data = []
        for date_str in sorted(date_list):
            activity_data.append({
                "date": date_str,
                **activity_by_day[date_str]
            })

        # Get user activity breakdown
        user_activity = {}
        for log in filtered_logs:
            username = log["username"]
            log_type = log["type"]

            # Initialize user if not exists
            if username not in user_activity:
                user_activity[username] = {
                    "downloads": 0,
                    "logins": 0,
                    "failed_downloads": 0,
                    "failed_logins": 0,
                    "quota_exceeded": 0,
                    "total": 0
                }

            # Increment counter for the log type
            if log_type == "download":
                user_activity[username]["downloads"] += 1
            elif log_type == "login":
                user_activity[username]["logins"] += 1
            elif log_type == "download_failed":
                user_activity[username]["failed_downloads"] += 1
            elif log_type == "login_failed":
                user_activity[username]["failed_logins"] += 1
            elif log_type == "quota_exceeded":
                user_activity[username]["quota_exceeded"] += 1

            user_activity[username]["total"] += 1

        # Convert to list and sort by total activity
        user_activity_list = [{
            "username": username,
            **activity
        } for username, activity in user_activity.items()]

        user_activity_list.sort(key=lambda x: x["total"], reverse=True)

        return jsonify({
            "success": True,
            "activity": {
                "by_day": activity_data,
                "by_user": user_activity_list
            }
        })
    except Exception as e:
        print(f"[ERROR] Failed to fetch activity data: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

# Settings API routes
@app.route('/api/settings', methods=["GET"])
@auth_required
@admin_required
def route_api_settings_get():
    try:
        # Get effective settings
        effective_settings = settings.get_effective_settings()

        # Get overridden settings keys
        overridden_settings = settings.get_overridden_settings()
        overridden_keys = list(overridden_settings.keys())

        return jsonify({
            "success": True,
            "settings": effective_settings,
            "overridden": overridden_keys
        })
    except Exception as e:
        print(f"[ERROR] Failed to fetch settings: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/settings/public', methods=["GET"])
def route_api_settings_public_get():
    """Public endpoint for non-sensitive settings that don't require authentication"""
    try:
        # Get effective settings
        effective_settings = settings.get_effective_settings()

        # Only include non-sensitive settings that are safe to expose publicly
        public_settings = {
            'auto-prompt-passkeys': effective_settings.get('auto-prompt-passkeys', True)
        }

        return jsonify({
            "success": True,
            "settings": public_settings
        })
    except Exception as e:
        print(f"[ERROR] Failed to fetch public settings: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/providers', methods=["GET"])
@auth_required
def route_api_providers():
    """Get all available providers"""
    try:
        providers_info = []

        # Get all providers
        for provider_id, provider in provider_manager.get_all_providers().items():
            providers_info.append({
                "id": provider_id,
                "name": provider.name,
                "enabled": provider.enabled
            })

        return jsonify({
            "success": True,
            "providers": providers_info
        })
    except Exception as e:
        print(f"[ERROR] Failed to fetch providers: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/providers/<provider_id>/toggle', methods=["POST"])
@auth_required
@admin_required
def route_api_providers_toggle(provider_id):
    """Toggle a provider's enabled status"""
    try:
        provider = provider_manager.get_provider(provider_id)
        if not provider:
            return jsonify({"success": False, "message": f"Provider {provider_id} not found"}), 404

        # Toggle enabled status
        provider.enabled = not provider.enabled
        print(f"[INFO] Provider {provider_id} ({provider.name}) is now {'enabled' if provider.enabled else 'disabled'}")

        # Save provider settings to settings database
        current_settings = settings.get_overridden_settings()
        if "providers" not in current_settings:
            current_settings["providers"] = {}

        # Update provider enabled status
        current_settings["providers"][provider_id] = {
            "enabled": provider.enabled
        }

        # Save settings
        settings.save_settings(current_settings)

        return jsonify({
            "success": True,
            "provider": {
                "id": provider_id,
                "name": provider.name,
                "enabled": provider.enabled
            }
        })
    except Exception as e:
        print(f"[ERROR] Failed to toggle provider: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/settings', methods=["POST"])
@auth_required
@admin_required
def route_api_settings_update():
    try:
        # Get settings from request
        new_settings = request.json.get("settings", {})

        # Update settings
        success = settings.update_settings(new_settings)

        # Apply settings to environment variables
        if success:
            settings.apply_settings_to_env()

            # Reinitialize qBittorrent client if qBittorrent settings changed
            if any(key in new_settings for key in ['qb-url', 'qb-user', 'qb-password', 'disable-qb']):
                global qbclient
                qbclient = None
                if not os.environ.get('disable-qb', '').lower() == 'true':
                    ensure_qb_auth()

            # Reinitialize TMDB client if API key changed
            if 'tmdb-api-key' in new_settings:
                global tmdb
                tmdb = TMDBClient()

            # Log WebAuthn configuration changes if any
            if any(key in new_settings for key in ['RP_ID', 'RP_NAME', 'RP_ORIGIN']):
                print(f"[INFO] WebAuthn configuration updated: RP_ID={os.environ.get('RP_ID')}, RP_NAME={os.environ.get('RP_NAME')}, RP_ORIGIN={os.environ.get('RP_ORIGIN')}")

            # Refresh token settings if token-related settings changed
            if any(key in new_settings for key in ['ACCESS_TOKEN_EXPIRY', 'REFRESH_TOKEN_EXPIRY', 'SHORT_REFRESH_TOKEN_EXPIRY']):
                tokens.get_token_settings()
                print(f"[INFO] Token settings refreshed")

            # Handle DATA_DIR changes
            if 'DATA_DIR' in new_settings:
                # The DATA_DIR environment variable has been updated by apply_settings_to_env()
                # We need to update the config.DATA_DIR variable and reinitialize the data directory
                config.DATA_DIR = os.environ.get('DATA_DIR', 'data')
                config.ensure_data_dir()
                print(f"[INFO] Data directory updated to {config.DATA_DIR}")

                # Note: This doesn't move existing data files to the new location
                # Users will need to manually move their data files if they change this setting

        return jsonify({
            "success": success,
            "message": "Settings updated successfully" if success else "Failed to update settings"
        })
    except Exception as e:
        print(f"[ERROR] Failed to update settings: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/settings/reset', methods=["POST"])
@auth_required
@admin_required
def route_api_settings_reset():
    try:
        # Reset settings by saving an empty dictionary
        success = settings.save_settings({})

        # Apply settings to environment variables
        if success:
            settings.apply_settings_to_env()

            # Reinitialize qBittorrent client
            global qbclient
            qbclient = None
            if not os.environ.get('disable-qb', '').lower() == 'true':
                ensure_qb_auth()

            # Refresh token settings
            tokens.get_token_settings()
            print(f"[INFO] Token settings reset to defaults")

        return jsonify({
            "success": success,
            "message": "Settings reset successfully" if success else "Failed to reset settings"
        })
    except Exception as e:
        print(f"[ERROR] Failed to reset settings: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

# Passkey API routes
@app.route('/api/passkeys', methods=["GET"])
@auth_required
def route_api_passkeys_get():
    try:
        username = users.get_current_user()
        user_passkeys = passkeys.get_user_passkeys(username)

        # Remove sensitive data
        safe_passkeys = []
        for pk in user_passkeys:
            safe_passkeys.append({
                'credential_id': pk['credential_id'],
                'name': pk['name'],
                'created_at': pk['created_at'],
                'last_used': pk['last_used']
            })

        return jsonify({
            "success": True,
            "passkeys": safe_passkeys
        })
    except Exception as e:
        print(f"[ERROR] Failed to fetch passkeys: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/passkeys/register/options', methods=["POST"])
@auth_required
def route_api_passkeys_register_options():
    try:
        username = users.get_current_user()
        options = passkeys.generate_passkey_registration_options(username)

        return jsonify({
            "success": True,
            "options": options
        })
    except Exception as e:
        print(f"[ERROR] Failed to generate registration options: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/passkeys/register/verify', methods=["POST"])
@auth_required
def route_api_passkeys_register_verify():
    try:
        print(f"[INFO] Received passkey registration verification request")
        credential_data = request.json.get("credential")
        passkey_name = request.json.get("name", "My Passkey")
        print(f"[INFO] Passkey name: {passkey_name}")

        if not credential_data:
            print(f"[ERROR] No credential data in request")
            return jsonify({"success": False, "message": "Credential data is required"}), 400

        print(f"[INFO] Calling verify_passkey_registration")
        success, message = passkeys.verify_passkey_registration(credential_data, passkey_name)
        print(f"[INFO] Registration verification result: success={success}, message={message}")

        return jsonify({
            "success": success,
            "message": message
        })
    except Exception as e:
        print(f"[ERROR] Failed to verify passkey registration: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/passkeys/authenticate/options', methods=["POST"])
def route_api_passkeys_authenticate_options():
    try:
        username = request.json.get("username")
        remember_me = request.json.get("remember_me", False)

        if not username:
            return jsonify({"success": False, "message": "Username is required"}), 400

        # Store remember_me preference in session for later use during verification
        session['remember_me'] = remember_me

        options, error = passkeys.generate_passkey_authentication_options(username)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return jsonify({
            "success": True,
            "options": options
        })
    except Exception as e:
        print(f"[ERROR] Failed to generate authentication options: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/passkeys/authenticate/passwordless/options', methods=["GET"])
def route_api_passkeys_authenticate_passwordless_options():
    try:
        print(f"[INFO] Generating passwordless authentication options")
        remember_me = request.args.get("remember_me", "false").lower() == "true"

        # Store remember_me preference in session for later use during verification
        session['remember_me'] = remember_me

        options, error = passkeys.generate_passwordless_authentication_options()

        if error:
            return jsonify({"success": False, "message": error}), 400

        return jsonify({
            "success": True,
            "options": options
        })
    except Exception as e:
        print(f"[ERROR] Failed to generate passwordless authentication options: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/passkeys/authenticate/verify', methods=["POST"])
def route_api_passkeys_authenticate_verify():
    try:
        credential_data = request.json.get("credential")

        if not credential_data:
            return jsonify({"success": False, "message": "Credential data is required"}), 400

        success, message, auth_data = passkeys.verify_passkey_authentication(credential_data)

        if success:
            return jsonify({
                "success": success,
                "message": message,
                "access_token": auth_data["access_token"],
                "refresh_token": auth_data["refresh_token"],
                "expires_at": auth_data["expires_at"],
                "username": auth_data["username"],
                "is_admin": auth_data["is_admin"]
            })
        else:
            return jsonify({
                "success": success,
                "message": message
            })
    except Exception as e:
        print(f"[ERROR] Failed to verify passkey authentication: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route('/api/passkeys/<credential_id>', methods=["DELETE"])
@auth_required
def route_api_passkeys_delete(credential_id):
    try:
        success, message = passkeys.delete_passkey(credential_id)

        return jsonify({
            "success": success,
            "message": message
        })
    except Exception as e:
        print(f"[ERROR] Failed to delete passkey: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

# User suspension API routes
@app.route("/api/users/<username>/suspend", methods=["POST"])
@auth_required
@admin_required
def route_api_users_suspend(username):
    success, message = users.suspend_user(username)

    # Log user suspension if successful
    if success:
        admin_username = users.get_current_user()
        logs.log_user_suspended(admin_username, username)

    return jsonify({"success": success, "message": message})

@app.route("/api/users/<username>/unsuspend", methods=["POST"])
@auth_required
@admin_required
def route_api_users_unsuspend(username):
    success, message = users.unsuspend_user(username)

    # Log user unsuspension if successful
    if success:
        admin_username = users.get_current_user()
        logs.log_user_unsuspended(admin_username, username)

    return jsonify({"success": success, "message": message})

# User registration and approval API routes
@app.route("/register")
def route_register():
    # If already logged in, redirect to home
    if users.is_authenticated():
        return redirect("/")

    with open("static/register.html", "r") as f:
        return f.read()

@app.route("/api/register", methods=["POST"])
def route_api_register():
    username = request.json.get("username")
    password = request.json.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required"})

    # Get default quota settings
    daily_quota = settings.get_effective_settings().get("default-daily-quota", 0)
    weekly_quota = settings.get_effective_settings().get("default-weekly-quota", 0)
    monthly_quota = settings.get_effective_settings().get("default-monthly-quota", 0)

    # Create user with pending approval
    success, message = users.create_user(
        username,
        password,
        is_admin=False,
        daily_quota=daily_quota,
        weekly_quota=weekly_quota,
        monthly_quota=monthly_quota,
        pending_approval=True
    )

    # Log user registration if successful
    if success:
        logs.log_user_registered(username)
        message = "Registration successful. Your account is pending approval by an administrator."

    return jsonify({"success": success, "message": message})

@app.route("/api/users/<username>/approve", methods=["POST"])
@auth_required
@admin_required
def route_api_users_approve(username):
    success, message = users.approve_user(username)

    # Log user approval if successful
    if success:
        admin_username = users.get_current_user()
        logs.log_user_approved(admin_username, username)

    return jsonify({"success": success, "message": message})

@app.route("/api/users/<username>/reject", methods=["POST"])
@auth_required
@admin_required
def route_api_users_reject(username):
    success, message = users.reject_user(username)

    # Log user rejection if successful
    if success:
        admin_username = users.get_current_user()
        logs.log_user_rejected(admin_username, username)

    return jsonify({"success": success, "message": message})

# Invite link API routes
@app.route("/api/invites", methods=["GET"])
@auth_required
@admin_required
def route_api_invites_get():
    """Get all invite links"""
    try:
        invites_data = invites.get_invites()

        # Clean expired invites
        invites.clean_expired_invites()

        return jsonify({
            "success": True,
            "invites": invites_data["invites"]
        })
    except Exception as e:
        print(f"[ERROR] Failed to fetch invites: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route("/api/invites", methods=["POST"])
@auth_required
@admin_required
def route_api_invites_create():
    """Create a new invite link"""
    try:
        # Get parameters from request
        expiry_days = request.json.get("expiry_days", 7)
        max_uses = request.json.get("max_uses", 1)
        is_admin = request.json.get("is_admin", False)
        daily_quota = request.json.get("daily_quota")
        weekly_quota = request.json.get("weekly_quota")
        monthly_quota = request.json.get("monthly_quota")

        # If quotas not specified, use default settings
        if daily_quota is None:
            daily_quota = settings.get_effective_settings().get("default-daily-quota", 0)
        if weekly_quota is None:
            weekly_quota = settings.get_effective_settings().get("default-weekly-quota", 0)
        if monthly_quota is None:
            monthly_quota = settings.get_effective_settings().get("default-monthly-quota", 0)

        # Get current admin username
        admin_username = users.get_current_user()

        # Create invite
        success, message, invite_code = invites.create_invite(
            admin_username,
            expiry_days=expiry_days,
            max_uses=max_uses,
            is_admin=is_admin,
            daily_quota=daily_quota,
            weekly_quota=weekly_quota,
            monthly_quota=monthly_quota
        )

        if success:
            # Get the full invite data
            invite_data = invites.get_invite_by_code(invite_code)

            return jsonify({
                "success": True,
                "message": message,
                "invite": invite_data
            })
        else:
            return jsonify({
                "success": False,
                "message": message
            })
    except Exception as e:
        print(f"[ERROR] Failed to create invite: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route("/api/invites/<invite_code>", methods=["DELETE"])
@auth_required
@admin_required
def route_api_invites_delete(invite_code):
    """Delete an invite link"""
    try:
        # Get current admin username
        admin_username = users.get_current_user()

        # Delete invite
        success, message = invites.delete_invite(invite_code, admin_username)

        return jsonify({
            "success": success,
            "message": message
        })
    except Exception as e:
        print(f"[ERROR] Failed to delete invite: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

@app.route("/api/invites/validate/<invite_code>", methods=["GET"])
def route_api_invites_validate(invite_code):
    """Validate an invite code (public endpoint)"""
    try:
        # Validate invite
        is_valid, message, invite_data = invites.validate_invite(invite_code)

        # Don't return the full invite data for security reasons
        safe_data = None
        if is_valid and invite_data:
            safe_data = {
                "code": invite_data["code"],
                "expires_at": invite_data["expires_at"],
                "created_at": invite_data["created_at"]
            }

        return jsonify({
            "success": True,
            "valid": is_valid,
            "message": message,
            "invite": safe_data
        })
    except Exception as e:
        print(f"[ERROR] Failed to validate invite: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

# Modify the registration endpoint to support invite codes
@app.route("/api/register/invite", methods=["POST"])
def route_api_register_with_invite():
    """Register a new user with an invite code"""
    try:
        username = request.json.get("username")
        password = request.json.get("password")
        invite_code = request.json.get("invite_code")

        if not username or not password or not invite_code:
            return jsonify({"success": False, "message": "Username, password, and invite code are required"})

        # Validate the invite code
        is_valid, message, invite_data = invites.validate_invite(invite_code)

        if not is_valid:
            return jsonify({"success": False, "message": message})

        # Create user with the settings from the invite
        success, message = users.create_user(
            username,
            password,
            is_admin=invite_data["is_admin"],
            daily_quota=invite_data["daily_quota"],
            weekly_quota=invite_data["weekly_quota"],
            monthly_quota=invite_data["monthly_quota"],
            pending_approval=False  # No approval needed for invited users
        )

        if success:
            # Mark the invite as used
            invites.use_invite(invite_code)

            # Log user registration
            logs.log_event(username, "user_registered_with_invite", f"User registered with invite code {invite_code}")

            message = "Registration successful. You can now log in."

        return jsonify({"success": success, "message": message})
    except Exception as e:
        print(f"[ERROR] Failed to register with invite: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500

# Start the application
app.run("0.0.0.0", port=80, debug=True)