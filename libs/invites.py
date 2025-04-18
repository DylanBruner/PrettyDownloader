import os
import json
import secrets
import datetime
from datetime import timedelta
import libs.logs as logs

# Path to the invites database file
INVITES_DB_PATH = os.environ.get('INVITES_DB_PATH', 'invites.json')

def init_invites_db():
    """Initialize the invites database if it doesn't exist"""
    # Ensure the directory exists if path contains directories
    if os.path.dirname(INVITES_DB_PATH):
        os.makedirs(os.path.dirname(INVITES_DB_PATH), exist_ok=True)

    if not os.path.exists(INVITES_DB_PATH):
        with open(INVITES_DB_PATH, 'w') as f:
            json.dump({"invites": []}, f)
        print("[INFO] Created new invites database at", INVITES_DB_PATH)

def get_invites():
    """Get all invites from the database"""
    if not os.path.exists(INVITES_DB_PATH):
        print(f"[INFO] Invites file does not exist, initializing")
        init_invites_db()

    try:
        with open(INVITES_DB_PATH, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load invites: {e}")
        return {"invites": []}

def save_invites(invites_data):
    """Save invites data to the database"""
    with open(INVITES_DB_PATH, 'w') as f:
        json.dump(invites_data, f, indent=2)

def generate_invite_code():
    """Generate a unique invite code"""
    return secrets.token_urlsafe(16)

def create_invite(creator_username, expiry_days=7, max_uses=1, is_admin=False, daily_quota=0, weekly_quota=0, monthly_quota=0):
    """Create a new invite link
    
    Args:
        creator_username (str): Username of the admin creating the invite
        expiry_days (int): Number of days until the invite expires
        max_uses (int): Maximum number of times the invite can be used (0 for unlimited)
        is_admin (bool): Whether the invited user will be an admin
        daily_quota (int): Daily download quota for the invited user
        weekly_quota (int): Weekly download quota for the invited user
        monthly_quota (int): Monthly download quota for the invited user
        
    Returns:
        tuple: (success, message, invite_code)
    """
    invites_data = get_invites()
    
    # Generate a unique invite code
    invite_code = generate_invite_code()
    
    # Calculate expiry date
    now = datetime.datetime.now()
    expiry_date = (now + timedelta(days=expiry_days)).isoformat()
    
    # Create the invite
    invite = {
        'code': invite_code,
        'creator': creator_username,
        'created_at': now.isoformat(),
        'expires_at': expiry_date,
        'max_uses': max_uses,
        'uses': 0,
        'is_admin': is_admin,
        'daily_quota': daily_quota,
        'weekly_quota': weekly_quota,
        'monthly_quota': monthly_quota
    }
    
    # Add to invites
    invites_data['invites'].append(invite)
    
    # Save invites
    save_invites(invites_data)
    
    # Log invite creation
    logs.log_event(creator_username, 'invite_created', f"Created invite code {invite_code}")
    
    return True, "Invite created successfully", invite_code

def get_invite_by_code(invite_code):
    """Get an invite by its code
    
    Args:
        invite_code (str): The invite code to look up
        
    Returns:
        dict: The invite data or None if not found
    """
    invites_data = get_invites()
    
    for invite in invites_data['invites']:
        if invite['code'] == invite_code:
            return invite
    
    return None

def validate_invite(invite_code):
    """Validate an invite code
    
    Args:
        invite_code (str): The invite code to validate
        
    Returns:
        tuple: (is_valid, message, invite_data)
    """
    invite = get_invite_by_code(invite_code)
    
    if not invite:
        return False, "Invalid invite code", None
    
    # Check if expired
    now = datetime.datetime.now()
    expires_at = datetime.datetime.fromisoformat(invite['expires_at'])
    
    if now > expires_at:
        return False, "Invite code has expired", None
    
    # Check if max uses reached
    if invite['max_uses'] > 0 and invite['uses'] >= invite['max_uses']:
        return False, "Invite code has reached maximum uses", None
    
    return True, "Invite code is valid", invite

def use_invite(invite_code):
    """Mark an invite as used
    
    Args:
        invite_code (str): The invite code that was used
        
    Returns:
        bool: Whether the invite was successfully marked as used
    """
    invites_data = get_invites()
    
    for invite in invites_data['invites']:
        if invite['code'] == invite_code:
            # Increment uses
            invite['uses'] += 1
            
            # Save invites
            save_invites(invites_data)
            return True
    
    return False

def delete_invite(invite_code, admin_username):
    """Delete an invite
    
    Args:
        invite_code (str): The invite code to delete
        admin_username (str): Username of the admin deleting the invite
        
    Returns:
        tuple: (success, message)
    """
    invites_data = get_invites()
    
    for i, invite in enumerate(invites_data['invites']):
        if invite['code'] == invite_code:
            # Remove the invite
            invites_data['invites'].pop(i)
            
            # Save invites
            save_invites(invites_data)
            
            # Log invite deletion
            logs.log_event(admin_username, 'invite_deleted', f"Deleted invite code {invite_code}")
            
            return True, "Invite deleted successfully"
    
    return False, "Invite not found"

def clean_expired_invites():
    """Remove expired invites from the database
    
    Returns:
        int: Number of expired invites removed
    """
    invites_data = get_invites()
    now = datetime.datetime.now()
    
    # Filter out expired invites
    original_count = len(invites_data['invites'])
    invites_data['invites'] = [
        invite for invite in invites_data['invites']
        if datetime.datetime.fromisoformat(invite['expires_at']) > now
    ]
    
    # Calculate how many were removed
    removed_count = original_count - len(invites_data['invites'])
    
    if removed_count > 0:
        # Save invites
        save_invites(invites_data)
        print(f"[INFO] Removed {removed_count} expired invites")
    
    return removed_count
