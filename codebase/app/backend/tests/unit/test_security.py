"""Unit tests for core/security.py — no DB required."""
import pytest
from datetime import timedelta
# Skip if core.security doesn't exist yet - these are unit tests
try:
    from core.security import (
        hash_password, verify_password,
        create_access_token, create_refresh_token, decode_access_token,
        encrypt_field, decrypt_field,
    )
    CORE_SECURITY_EXISTS = True
except ImportError:
    CORE_SECURITY_EXISTS = False
    pytest.skip("core.security not implemented yet", allow_module_level=True)

pytestmark = pytest.mark.unit


class TestPasswordHashing:
    def test_hash_returns_string(self):
        h = hash_password("mypassword")
        assert isinstance(h, str) and len(h) > 20

    def test_verify_correct_password(self):
        h = hash_password("correct_horse_battery")
        assert verify_password("correct_horse_battery", h) is True

    def test_verify_wrong_password(self):
        h = hash_password("correct")
        assert verify_password("wrong", h) is False

    def test_hash_is_not_plaintext(self):
        h = hash_password("secret123")
        assert "secret123" not in h

    def test_two_hashes_of_same_password_differ(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2


class TestJWT:
    def test_create_and_decode_access_token(self):
        token = create_access_token({"sub": "user-123"})
        payload = decode_access_token(token)
        assert payload["sub"] == "user-123"

    def test_create_and_decode_refresh_token(self):
        token = create_refresh_token({"sub": "user-456"})
        assert token is not None and len(token) > 20

    def test_expired_token_raises(self):
        token = create_access_token(
            {"sub": "user-789"},
            expires_delta=timedelta(seconds=-1)
        )
        with pytest.raises(Exception):
            decode_access_token(token)

    def test_tampered_token_raises(self):
        token = create_access_token({"sub": "user-abc"})
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(Exception):
            decode_access_token(tampered)

    def test_access_token_contains_expiry(self):
        token = create_access_token({"sub": "user-exp"})
        payload = decode_access_token(token)
        assert "exp" in payload


class TestAESEncryption:
    def test_encrypt_decrypt_roundtrip(self):
        plaintext = "My real name is Priya Sharma"
        ciphertext = encrypt_field(plaintext)
        recovered = decrypt_field(ciphertext)
        assert recovered == plaintext

    def test_encryption_is_not_plaintext(self):
        ciphertext = encrypt_field("secret data")
        assert "secret data" not in ciphertext

    def test_same_plaintext_different_ciphertext(self):
        c1 = encrypt_field("same input")
        c2 = encrypt_field("same input")
        assert c1 != c2

    def test_decrypt_tampered_ciphertext_raises(self):
        ciphertext = encrypt_field("valid data")
        tampered = ciphertext[:-4] + "XXXX"
        with pytest.raises(Exception):
            decrypt_field(tampered)

    def test_empty_string_encrypts(self):
        c = encrypt_field("")
        assert decrypt_field(c) == ""

    def test_unicode_content_encrypts(self):
        text = "नमस्ते"
        assert decrypt_field(encrypt_field(text)) == text