"""
Security utilities for AirPrice.
- Passport number encryption/decryption using Fernet symmetric key.
- Key is stored in system_settings DB as ENCRYPTION_KEY.
- If no key exists, a new one is generated and stored on first use.
"""
import os
import logging
import base64
from typing import Optional

logger = logging.getLogger(__name__)

# Module-level cached key
_cached_key: Optional[bytes] = None

def _get_or_create_key() -> bytes:
    """Load the Fernet key from env or generate a new one."""
    global _cached_key
    if _cached_key:
        return _cached_key

    # Try env variable first (most secure - set by ops)
    env_key = os.environ.get("AIRPRICE_ENCRYPTION_KEY", "")
    if env_key:
        try:
            key = base64.urlsafe_b64decode(env_key)
            if len(key) == 32:
                _cached_key = base64.urlsafe_b64encode(key)
                return _cached_key
        except Exception:
            pass

    # Fallback: use a file-based key stored next to the DB
    from backend.config import BASE_DIR
    key_file = BASE_DIR / ".airprice.key"
    if key_file.exists():
        _cached_key = key_file.read_bytes().strip()
        return _cached_key

    # Generate a new key and persist it
    try:
        from cryptography.fernet import Fernet
        new_key = Fernet.generate_key()
        key_file.write_bytes(new_key)
        # Restrict permissions: owner read/write only
        key_file.chmod(0o600)
        logger.info("Generated new Fernet encryption key → .airprice.key")
        _cached_key = new_key
        return _cached_key
    except ImportError:
        # cryptography not installed — return None-like empty key
        logger.warning("cryptography not installed; passport numbers will not be encrypted.")
        return b""


def encrypt_passport(passport_number: Optional[str]) -> Optional[str]:
    """Encrypt a passport number. Returns ciphertext or original if crypto unavailable."""
    if not passport_number:
        return passport_number
    key = _get_or_create_key()
    if not key:
        return passport_number
    try:
        from cryptography.fernet import Fernet
        f = Fernet(key)
        token = f.encrypt(passport_number.encode("utf-8"))
        return token.decode("utf-8")
    except Exception as e:
        logger.warning(f"Passport encryption failed: {e}")
        return passport_number


def decrypt_passport(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypt a passport number. Returns plaintext or ciphertext if crypto unavailable."""
    if not ciphertext:
        return ciphertext
    key = _get_or_create_key()
    if not key:
        return ciphertext
    try:
        from cryptography.fernet import Fernet
        f = Fernet(key)
        return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except Exception:
        # Already plaintext or key mismatch — return as-is
        return ciphertext


def mask_passport(passport_number: Optional[str]) -> str:
    """Mask passport for display: AA1234567 → AA****67"""
    if not passport_number:
        return "-"
    n = len(passport_number)
    if n <= 4:
        return "*" * n
    return passport_number[:2] + "*" * (n - 4) + passport_number[-2:]
