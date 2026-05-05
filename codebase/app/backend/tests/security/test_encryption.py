"""Security: verify private profile fields are stored encrypted at rest."""
import pytest
import uuid

pytestmark = [pytest.mark.security, pytest.mark.api]


class TestPrivateProfileEncryptedAtRest:
    async def test_real_name_not_stored_as_plaintext(self, client, auth_headers, db_session):
        plaintext = "Priya Anand Sharma"
        await client.put("/api/v1/profiles/me/private", headers=auth_headers,
            json={"real_name": plaintext})
        me = await client.get("/api/v1/auth/me", headers=auth_headers)
        user_id = uuid.UUID(me.json()["id"])

        from models.profile import PrivateProfile
        from sqlalchemy import select
        result = await db_session.execute(
            select(PrivateProfile).where(PrivateProfile.user_id == user_id)
        )
        pp = result.scalar_one_or_none()
        if pp and pp.real_name:
            raw = pp.real_name if isinstance(pp.real_name, bytes) else str(pp.real_name).encode()
            assert plaintext.encode() not in raw

    async def test_decrypt_field_matches_original(self):
        from core.security import encrypt_field, decrypt_field
        plaintext = "Sensitive private data"
        ciphertext = encrypt_field(plaintext)
        assert decrypt_field(ciphertext) == plaintext

    async def test_tampered_ciphertext_raises(self):
        from core.security import encrypt_field, decrypt_field
        ct = encrypt_field("data")
        tampered = ct[:-4] + "XXXX"
        with pytest.raises(Exception):
            decrypt_field(tampered)