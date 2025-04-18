import os
import json
import bcrypt
from flask import session
import libs.tokens as tokens

# Path to the users database file
USERS_DB_PATH = os.environ.get('USERS_DB_PATH', 'users.json')

def init_users_db():
    """Initialize the users database if it doesn't exist"""
    # Ensure the directory exists if path contains directories
    if os.path.dirname(USERS_DB_PATH):
        os.makedirs(os.path.dirname(USERS_DB_PATH), exist_ok=True)

    if not os.path.exists(USERS_DB_PATH):
        with open(USERS_DB_PATH, 'w') as f:
            json.dump({"users": []}, f)
        print("[INFO] Created new users database at", USERS_DB_PATH)
        # Create default admin user if no users exist
        create_user('admin', 'admin', is_admin=True)
        print("[INFO] Created default admin user (username: admin, password: admin)")

def get_users():
    """Get all users from the database"""
    print(f"[INFO] Getting users from {USERS_DB_PATH}")
    if not os.path.exists(USERS_DB_PATH):
        print(f"[INFO] Users file does not exist, initializing")
        init_users_db()

    try:
        with open(USERS_DB_PATH, 'r') as f:
            data = json.load(f)
            print(f"[INFO] Loaded {len(data.get('users', []))} users from database")
            return data
    except Exception as e:
        print(f"[ERROR] Failed to load users: {e}")
        return {"users": []}

def save_users(users_data):
    """Save users data to the database"""
    with open(USERS_DB_PATH, 'w') as f:
        json.dump(users_data, f, indent=2)

def create_user(username, password, is_admin=False):
    """Create a new user with hashed password"""
    users_data = get_users()

    # Check if username already exists
    for user in users_data['users']:
        if user['username'] == username:
            return False, "Username already exists"

    # Hash the password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    # Add the new user
    users_data['users'].append({
        'username': username,
        'password': hashed_password.decode('utf-8'),  # Store as string
        'is_admin': is_admin
    })

    save_users(users_data)
    return True, "User created successfully"

def verify_user(username, password):
    """Verify user credentials"""
    users_data = get_users()

    for user in users_data['users']:
        if user['username'] == username:
            # Check password
            if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
                return True

    return False

def is_authenticated():
    """Check if the current user is authenticated"""
    # First check session-based authentication (for backward compatibility)
    if 'username' in session:
        return True

    # Then check token-based authentication
    token = tokens.get_token_from_header()
    if token:
        payload, error = tokens.validate_access_token(token)
        return payload is not None

    return False

def login_user(username, remember_me=False):
    """Log in a user by setting session data and generating tokens"""
    # Set session data (for backward compatibility)
    session['username'] = username

    # Generate tokens
    is_admin_user = is_user_admin(username)
    access_token = tokens.generate_access_token(username, is_admin_user)
    refresh_token, expires_at = tokens.generate_refresh_token(username, remember_me)

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'expires_at': expires_at,
        'username': username,
        'is_admin': is_admin_user
    }

def logout_user(refresh_token=None):
    """Log out the current user by clearing session data and revoking tokens"""
    # Clear session data
    session.pop('username', None)

    # Revoke refresh token if provided
    if refresh_token:
        tokens.revoke_refresh_token(refresh_token)

def get_current_user():
    """Get the current logged-in username"""
    # First check session-based authentication
    username = session.get('username')
    if username:
        return username

    # Then check token-based authentication
    token = tokens.get_token_from_header()
    if token:
        payload, error = tokens.validate_access_token(token)
        if payload:
            return payload.get('username')

    return None

def is_user_admin(username):
    """Check if a specific user is an admin"""
    users_data = get_users()

    for user in users_data['users']:
        if user['username'] == username:
            return user.get('is_admin', False)

    return False

def is_admin(username=None):
    """Check if a user is an admin"""
    print(f"[INFO] Checking if user is admin: {username}")
    if username is None:
        # First check session-based authentication
        username = get_current_user()
        print(f"[INFO] Using current user: {username}")
        if not username:
            print("[INFO] No current user, not admin")
            return False

        # If using token-based authentication, check the token payload directly
        token = tokens.get_token_from_header()
        if token:
            payload, _ = tokens.validate_access_token(token)
            if payload and 'is_admin' in payload:
                is_admin_value = payload['is_admin']
                print(f"[INFO] User from token is_admin: {is_admin_value}")
                return is_admin_value

    # Fall back to database check
    return is_user_admin(username)

def get_all_users():
    """Get all users with their information (except passwords)"""
    print("[INFO] Getting all users (safe version)")
    users_data = get_users()

    # Create a copy without password information
    safe_users = []
    for user in users_data['users']:
        safe_user = {
            'username': user['username'],
            'is_admin': user.get('is_admin', False)
        }
        safe_users.append(safe_user)
        print(f"[INFO] Added safe user: {safe_user}")

    print(f"[INFO] Returning {len(safe_users)} safe users")
    return safe_users

def delete_user(username):
    """Delete a user"""
    # Don't allow deleting the current user
    if username == get_current_user():
        return False, "Cannot delete your own account"

    users_data = get_users()

    # Find the user to delete
    for i, user in enumerate(users_data['users']):
        if user['username'] == username:
            # Don't delete the last admin
            if user.get('is_admin', False) and sum(1 for u in users_data['users'] if u.get('is_admin', False)) <= 1:
                return False, "Cannot delete the last admin user"

            # Remove the user
            users_data['users'].pop(i)
            save_users(users_data)
            return True, "User deleted successfully"

    return False, "User not found"

def toggle_admin(username):
    """Toggle admin status for a user"""
    users_data = get_users()

    # Find the user
    for user in users_data['users']:
        if user['username'] == username:
            # Don't remove admin from the last admin
            if user.get('is_admin', False) and sum(1 for u in users_data['users'] if u.get('is_admin', False)) <= 1:
                return False, "Cannot remove admin status from the last admin user"

            # Toggle admin status
            user['is_admin'] = not user.get('is_admin', False)
            save_users(users_data)

            new_status = "admin" if user['is_admin'] else "regular user"
            return True, f"User {username} is now a {new_status}"

    return False, "User not found"

def change_password(username, new_password):
    """Change a user's password"""
    print(f"[INFO] Changing password for user: {username}")
    users_data = get_users()

    for user in users_data['users']:
        if user['username'] == username:
            print(f"[INFO] Found user {username}, hashing new password")
            # Hash the new password
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
            user['password'] = hashed_password.decode('utf-8')
            print(f"[INFO] Saving updated user data")
            save_users(users_data)
            return True, "Password changed successfully"

    print(f"[ERROR] User {username} not found")
    return False, "User not found"
