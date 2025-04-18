import os
import json
import time
from flask import session
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
)
from webauthn.helpers import bytes_to_base64url, base64url_to_bytes
import libs.users as users
import libs.tokens as tokens
import libs.config as config

# Path to the passkeys database file
PASSKEYS_DB_PATH = config.PASSKEYS_DB_PATH

# WebAuthn configuration
# These settings determine how passkeys work with your domain
# RP_ID: The domain name for your application (e.g., 'example.com')
# RP_NAME: The human-readable name of your application
# RP_ORIGIN: The full origin URL of your application (e.g., 'https://example.com')
RP_ID = os.environ.get('RP_ID', 'localhost')
RP_NAME = os.environ.get('RP_NAME', 'PrettyDownloader')
RP_ORIGIN = os.environ.get('RP_ORIGIN', 'http://localhost')

# Print WebAuthn configuration for debugging
print(f"[INFO] WebAuthn configuration: RP_ID={RP_ID}, RP_NAME={RP_NAME}, RP_ORIGIN={RP_ORIGIN}")

def init_passkeys_db():
    """Initialize the passkeys database if it doesn't exist"""
    # Ensure the directory exists if path contains directories
    if os.path.dirname(PASSKEYS_DB_PATH):
        os.makedirs(os.path.dirname(PASSKEYS_DB_PATH), exist_ok=True)

    if not os.path.exists(PASSKEYS_DB_PATH):
        with open(PASSKEYS_DB_PATH, 'w') as f:
            json.dump({"passkeys": []}, f)
        print("[INFO] Created new passkeys database at", PASSKEYS_DB_PATH)

def get_passkeys():
    """Get all passkeys from the database"""
    print(f"[INFO] Getting passkeys from {PASSKEYS_DB_PATH}")
    if not os.path.exists(PASSKEYS_DB_PATH):
        print(f"[INFO] Passkeys file does not exist, initializing")
        init_passkeys_db()

    try:
        with open(PASSKEYS_DB_PATH, 'r') as f:
            data = json.load(f)
            print(f"[INFO] Loaded {len(data.get('passkeys', []))} passkeys from database")
            return data
    except Exception as e:
        print(f"[ERROR] Failed to load passkeys: {e}")
        return {"passkeys": []}

def save_passkeys(passkeys_data):
    """Save passkeys data to the database"""
    with open(PASSKEYS_DB_PATH, 'w') as f:
        json.dump(passkeys_data, f, indent=2)

def get_user_passkeys(username):
    """Get all passkeys for a specific user"""
    passkeys_data = get_passkeys()
    user_passkeys = []

    for passkey in passkeys_data['passkeys']:
        if passkey['username'] == username:
            user_passkeys.append(passkey)

    return user_passkeys

def generate_passkey_registration_options(username):
    """Generate registration options for a new passkey"""
    # Get existing passkeys for this user to exclude them
    user_passkeys = get_user_passkeys(username)
    exclude_credentials = []

    for passkey in user_passkeys:
        exclude_credentials.append(
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(passkey['credential_id']))
        )

    # Generate registration options
    options = generate_registration_options(
        user_id=username.encode('utf-8'),  # Convert username to bytes
        user_name=username,
        rp_id=RP_ID,
        rp_name=RP_NAME,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.DISCOURAGED,
        ),
        exclude_credentials=exclude_credentials,
    )

    # Store challenge in session for verification
    session['challenge'] = options.challenge

    # Convert options to a dictionary for JSON serialization
    options_dict = {
        'rp': {
            'name': options.rp.name,
            'id': options.rp.id
        },
        'user': {
            'id': bytes_to_base64url(options.user.id),  # Convert bytes to base64url
            'name': options.user.name,
            'display_name': options.user.display_name
        },
        'challenge': bytes_to_base64url(options.challenge),  # Convert bytes to base64url
        'pubKeyCredParams': [{'type': param.type, 'alg': param.alg} for param in options.pub_key_cred_params],
        'timeout': options.timeout,
        'excludeCredentials': [{
            'type': cred.type,
            'id': bytes_to_base64url(cred.id)  # Convert bytes to base64url
        } for cred in options.exclude_credentials] if options.exclude_credentials else [],
        'authenticatorSelection': {
            'authenticatorAttachment': options.authenticator_selection.authenticator_attachment,
            'requireResidentKey': options.authenticator_selection.require_resident_key,
            'residentKey': options.authenticator_selection.resident_key,
            'userVerification': options.authenticator_selection.user_verification
        } if options.authenticator_selection else None,
        'attestation': options.attestation
    }

    return options_dict

def verify_passkey_registration(credential_data, passkey_name):
    """Verify a passkey registration response"""
    try:
        print(f"[INFO] Starting passkey registration verification")
        print(f"[INFO] Credential data: {credential_data[:100]}...")

        # Parse the credential data
        credential_dict = json.loads(credential_data)
        print(f"[INFO] Parsed credential dictionary: {json.dumps(credential_dict)[:100]}...")

        # Create a RegistrationCredential object directly from the dictionary
        # The WebAuthn library will handle parsing the credential
        credential = {
            'id': credential_dict['id'],
            'rawId': credential_dict['rawId'],
            'response': {
                'clientDataJSON': credential_dict['response']['clientDataJSON'],
                'attestationObject': credential_dict['response']['attestationObject']
            },
            'type': credential_dict['type']
        }
        print(f"[INFO] Created credential object: id={credential['id']}, type={credential['type']}")

        # Get challenge from session
        challenge = session.pop('challenge', None)
        if not challenge:
            print(f"[ERROR] No challenge found in session")
            return False, "No challenge found in session"

        print(f"[INFO] Challenge from session: {challenge[:20]}...")
        print(f"[INFO] Verifying with RP_ID={RP_ID}, RP_ORIGIN={RP_ORIGIN}")

        # Verify the registration response
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=RP_ORIGIN,
            require_user_verification=False,
        )
        print(f"[INFO] Verification successful")

        # Get the current user
        username = users.get_current_user()
        if not username:
            return False, "User not authenticated"

        # Create a new passkey entry
        passkey = {
            'username': username,
            'name': passkey_name,
            'credential_id': bytes_to_base64url(verification.credential_id),
            'public_key': bytes_to_base64url(verification.credential_public_key),
            'sign_count': verification.sign_count,
            'created_at': int(time.time()),
            'last_used': int(time.time()),
        }

        # Save the passkey to the database
        passkeys_data = get_passkeys()
        passkeys_data['passkeys'].append(passkey)
        save_passkeys(passkeys_data)

        return True, "Passkey registered successfully"
    except Exception as e:
        print(f"[ERROR] Failed to verify passkey registration: {e}")
        return False, f"Failed to verify passkey registration: {str(e)}"

def generate_passkey_authentication_options(username):
    """Generate authentication options for passkey login"""
    # Get existing passkeys for this user
    user_passkeys = get_user_passkeys(username)

    if not user_passkeys:
        return None, "No passkeys found for this user"

    allow_credentials = []
    for passkey in user_passkeys:
        allow_credentials.append(
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(passkey['credential_id']))
        )

    # Generate authentication options
    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.DISCOURAGED,
    )

    # Store challenge and username in session for verification
    session['challenge'] = options.challenge
    session['auth_username'] = username

    # Convert options to a dictionary for JSON serialization
    options_dict = {
        'challenge': bytes_to_base64url(options.challenge),  # Convert bytes to base64url
        'timeout': options.timeout,
        'rpId': options.rp_id,
        'allowCredentials': [{
            'type': cred.type,
            'id': bytes_to_base64url(cred.id)  # Convert bytes to base64url
        } for cred in options.allow_credentials] if options.allow_credentials else [],
        'userVerification': options.user_verification
    }

    return options_dict, None

def generate_passwordless_authentication_options():
    """Generate authentication options for passwordless login (no username required)"""
    # Get all passkeys
    passkeys_data = get_passkeys()

    if not passkeys_data['passkeys']:
        return None, "No passkeys found"

    allow_credentials = []
    for passkey in passkeys_data['passkeys']:
        allow_credentials.append(
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(passkey['credential_id']))
        )

    # Generate authentication options
    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.REQUIRED,  # Require verification for passwordless
    )

    # Store challenge in session for verification
    session['challenge'] = options.challenge
    # No username is stored in session for passwordless login

    # Convert options to a dictionary for JSON serialization
    options_dict = {
        'challenge': bytes_to_base64url(options.challenge),  # Convert bytes to base64url
        'timeout': options.timeout,
        'rpId': options.rp_id,
        'allowCredentials': [{
            'type': cred.type,
            'id': bytes_to_base64url(cred.id)  # Convert bytes to base64url
        } for cred in options.allow_credentials] if options.allow_credentials else [],
        'userVerification': options.user_verification
    }

    return options_dict, None

def verify_passkey_authentication(credential_data):
    """Verify a passkey authentication response"""
    try:
        print(f"[INFO] Starting passkey authentication verification")
        print(f"[INFO] Credential data: {credential_data[:100]}...")

        # Parse the credential data
        credential_dict = json.loads(credential_data)
        print(f"[INFO] Parsed credential dictionary: {json.dumps(credential_dict)[:100]}...")

        # Create an AuthenticationCredential object directly from the dictionary
        # The WebAuthn library will handle parsing the credential
        credential = {
            'id': credential_dict['id'],
            'rawId': credential_dict['rawId'],
            'response': {
                'clientDataJSON': credential_dict['response']['clientDataJSON'],
                'authenticatorData': credential_dict['response']['authenticatorData'],
                'signature': credential_dict['response']['signature'],
                'userHandle': credential_dict['response'].get('userHandle')
            },
            'type': credential_dict['type']
        }
        print(f"[INFO] Created credential object: id={credential['id']}, type={credential['type']}")

        # Get the username from session if available (for username+passkey flow)
        username = session.pop('auth_username', None)

        # Find the passkey
        passkeys_data = get_passkeys()
        passkey = None

        # If we have a username, look for a passkey matching both username and credential ID
        if username:
            print(f"[INFO] Username from session: {username}")
            for pk in passkeys_data['passkeys']:
                if pk['credential_id'] == credential['id'] and pk['username'] == username:
                    passkey = pk
                    break
        # Otherwise, just look for a passkey matching the credential ID (passwordless flow)
        else:
            print(f"[INFO] No username in session, using passwordless flow")
            for pk in passkeys_data['passkeys']:
                if pk['credential_id'] == credential['id']:
                    passkey = pk
                    username = pk['username']  # Get the username from the passkey
                    break

        if not passkey:
            print(f"[ERROR] No passkey found for credential ID {credential['id']}")
            return False, "Passkey not found"

        print(f"[INFO] Found passkey: {passkey['name']}")

        # Get challenge from session
        challenge = session.pop('challenge', None)
        if not challenge:
            print(f"[ERROR] No challenge found in session")
            return False, "No challenge found in session"

        print(f"[INFO] Challenge from session: {challenge[:20]}...")
        print(f"[INFO] Verifying with RP_ID={RP_ID}, RP_ORIGIN={RP_ORIGIN}")

        # Verify the authentication response
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=RP_ORIGIN,
            credential_public_key=base64url_to_bytes(passkey['public_key']),
            credential_current_sign_count=passkey['sign_count'],
            require_user_verification=False,
        )
        print(f"[INFO] Authentication verification successful")

        # Update the passkey sign count and last used time
        passkey['sign_count'] = verification.new_sign_count
        passkey['last_used'] = int(time.time())
        save_passkeys(passkeys_data)

        # Log the user in and generate tokens
        # Check if remember_me was set in session
        remember_me = session.pop('remember_me', False)
        auth_data = users.login_user(username, remember_me)

        return True, "Authentication successful", auth_data
    except Exception as e:
        print(f"[ERROR] Failed to verify passkey authentication: {e}")
        return False, f"Failed to verify passkey authentication: {str(e)}"

def delete_passkey(credential_id):
    """Delete a passkey"""
    # Get the current user
    username = users.get_current_user()
    if not username:
        return False, "User not authenticated"

    # Find and delete the passkey
    passkeys_data = get_passkeys()
    for i, passkey in enumerate(passkeys_data['passkeys']):
        if passkey['credential_id'] == credential_id and passkey['username'] == username:
            passkeys_data['passkeys'].pop(i)
            save_passkeys(passkeys_data)
            return True, "Passkey deleted successfully"

    return False, "Passkey not found"
