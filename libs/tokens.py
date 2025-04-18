import os
import jwt
import time
import secrets
from datetime import datetime, timedelta, timezone
from flask import request, jsonify
import libs.settings as settings

# Default token settings
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', secrets.token_hex(32))

# Store for refresh tokens (in-memory for now, could be moved to database)
# Format: {refresh_token: {'username': username, 'expires_at': timestamp}}
refresh_tokens = {}

def get_token_settings():
    """Get token settings from the settings module"""
    # Get settings from the settings module
    all_settings = settings.get_effective_settings()

    # Get token settings with defaults
    access_token_expiry = all_settings.get('ACCESS_TOKEN_EXPIRY', 15 * 60)  # 15 minutes in seconds
    refresh_token_expiry = all_settings.get('REFRESH_TOKEN_EXPIRY', 30 * 24 * 60 * 60)  # 30 days in seconds
    short_refresh_token_expiry = all_settings.get('SHORT_REFRESH_TOKEN_EXPIRY', 24 * 60 * 60)  # 1 day in seconds

    # Print token settings for debugging
    print(f"[INFO] Token settings: ACCESS_TOKEN_EXPIRY={access_token_expiry}s, REFRESH_TOKEN_EXPIRY={refresh_token_expiry}s, SHORT_REFRESH_TOKEN_EXPIRY={short_refresh_token_expiry}s")

    return {
        'access_token_expiry': access_token_expiry,
        'refresh_token_expiry': refresh_token_expiry,
        'short_refresh_token_expiry': short_refresh_token_expiry
    }



def generate_access_token(username, is_admin=False):
    """Generate a new access token for a user"""
    token_settings = get_token_settings()
    access_token_expiry = token_settings['access_token_expiry']

    payload = {
        'username': username,
        'is_admin': is_admin,
        'exp': datetime.now(timezone.utc) + timedelta(seconds=access_token_expiry),
        'iat': datetime.now(timezone.utc),
        'type': 'access'
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')

def generate_refresh_token(username, remember_me=False):
    """Generate a new refresh token for a user"""
    # Get token settings
    token_settings = get_token_settings()

    # If remember_me is False, use a shorter expiry time
    expiry = token_settings['refresh_token_expiry'] if remember_me else token_settings['short_refresh_token_expiry']

    token = secrets.token_hex(32)
    expires_at = int(time.time()) + expiry

    # Store the refresh token
    refresh_tokens[token] = {
        'username': username,
        'expires_at': expires_at
    }

    return token, expires_at

def validate_access_token(token):
    """Validate an access token and return the payload if valid"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])

        # Check token type
        if payload.get('type') != 'access':
            return None, "Invalid token type"

        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"

def validate_refresh_token(token):
    """Validate a refresh token and return the username if valid"""
    if token not in refresh_tokens:
        return None, "Invalid refresh token"

    token_data = refresh_tokens[token]

    # Check if token is expired
    if token_data['expires_at'] < int(time.time()):
        # Remove expired token
        refresh_tokens.pop(token)
        return None, "Refresh token expired"

    return token_data['username'], None

def refresh_access_token(refresh_token):
    """Generate a new access token using a refresh token"""
    username, error = validate_refresh_token(refresh_token)

    if error:
        return None, error

    # Get user admin status
    import libs.users as users
    is_admin = users.is_user_admin(username)

    # Generate new access token
    access_token = generate_access_token(username, is_admin)

    return access_token, None

def revoke_refresh_token(token):
    """Revoke a refresh token"""
    if token in refresh_tokens:
        refresh_tokens.pop(token)
        return True
    return False

def revoke_all_user_refresh_tokens(username):
    """Revoke all refresh tokens for a user"""
    global refresh_tokens
    refresh_tokens = {
        token: data for token, data in refresh_tokens.items()
        if data['username'] != username
    }

def get_token_from_header():
    """Extract the token from the Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    return auth_header.split(' ')[1]

def token_required(f):
    """Decorator for routes that require a valid access token"""
    def decorated(*args, **kwargs):
        token = get_token_from_header()

        if not token:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401

        payload, error = validate_access_token(token)

        if error:
            return jsonify({'success': False, 'message': error}), 401

        # Add user info to kwargs
        kwargs['username'] = payload['username']
        kwargs['is_admin'] = payload['is_admin']

        return f(*args, **kwargs)

    decorated.__name__ = f.__name__
    return decorated

def admin_token_required(f):
    """Decorator for routes that require admin privileges"""
    def decorated(*args, **kwargs):
        token = get_token_from_header()

        if not token:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401

        payload, error = validate_access_token(token)

        if error:
            return jsonify({'success': False, 'message': error}), 401

        if not payload.get('is_admin', False):
            return jsonify({'success': False, 'message': 'Admin privileges required'}), 403

        # Add user info to kwargs
        kwargs['username'] = payload['username']
        kwargs['is_admin'] = payload['is_admin']

        return f(*args, **kwargs)

    decorated.__name__ = f.__name__
    return decorated

def cleanup_expired_tokens():
    """Remove expired refresh tokens"""
    global refresh_tokens
    current_time = int(time.time())
    refresh_tokens = {
        token: data for token, data in refresh_tokens.items()
        if data['expires_at'] > current_time
    }
