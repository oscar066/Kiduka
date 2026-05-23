"""
Unit tests for AuthSecurityManager (JWT tokens and password hashing)
"""
import time
import pytest
from datetime import timedelta
from api.services.auth.core.security import AuthSecurityManager

class TestPasswordHashing:

    def test_hash_is_not_plaintext(self):
        hashed = AuthSecurityManager.get_password_hash("mypassword1")
        assert hashed != "mypassword1"
        assert len(hashed) > 20

    def test_correct_password_verifies(self):
        hashed = AuthSecurityManager.get_password_hash("correctpassword1")
        assert AuthSecurityManager.verify_password("correctpassword1", hashed) is True

    def test_wrong_password_rejected(self):
        hashed = AuthSecurityManager.get_password_hash("correctpassword1")
        assert AuthSecurityManager.verify_password("wrongpassword1", hashed) is False

    def test_same_password_produces_different_hashes(self):
        # bcrypt uses a random salt, so each hash should differ
        h1 = AuthSecurityManager.get_password_hash("samepassword1")
        h2 = AuthSecurityManager.get_password_hash("samepassword1")
        assert h1 != h2

    def test_both_hashes_verify_with_same_password(self):
        h1 = AuthSecurityManager.get_password_hash("samepassword1")
        h2 = AuthSecurityManager.get_password_hash("samepassword1")
        assert AuthSecurityManager.verify_password("samepassword1", h1)
        assert AuthSecurityManager.verify_password("samepassword1", h2)


class TestJWTTokens:

    def test_create_and_verify_token(self):
        payload = {"sub": "user-123", "username": "testuser", "role": "user"}
        token = AuthSecurityManager.create_access_token(data=payload)

        token_data = AuthSecurityManager.verify_token(token)

        assert token_data is not None
        assert token_data.user_id == "user-123"
        assert token_data.username == "testuser"
        assert token_data.role == "user"

    def test_token_without_sub_returns_none(self):
        # A token missing the 'sub' field should fail verification
        payload = {"username": "testuser", "role": "user"}
        token = AuthSecurityManager.create_access_token(data=payload)

        result = AuthSecurityManager.verify_token(token)

        assert result is None

    def test_tampered_token_returns_none(self):
        payload = {"sub": "user-123", "username": "testuser", "role": "user"}
        token = AuthSecurityManager.create_access_token(data=payload)
        tampered = token[:-5] + "XXXXX"

        result = AuthSecurityManager.verify_token(tampered)

        assert result is None

    def test_garbage_token_returns_none(self):
        result = AuthSecurityManager.verify_token("not.a.valid.jwt.token")
        assert result is None

    def test_token_respects_custom_expiry(self):
        payload = {"sub": "user-456", "username": "expireuser", "role": "user"}
        # Very short expiry
        token = AuthSecurityManager.create_access_token(
            data=payload, expires_delta=timedelta(seconds=1)
        )
        token_data = AuthSecurityManager.verify_token(token)
        assert token_data is not None

    def test_admin_role_preserved_in_token(self):
        payload = {"sub": "admin-1", "username": "admin", "role": "admin"}
        token = AuthSecurityManager.create_access_token(data=payload)
        token_data = AuthSecurityManager.verify_token(token)

        assert token_data.role == "admin"

    def test_super_admin_role_preserved_in_token(self):
        payload = {"sub": "sa-1", "username": "superadmin", "role": "super_admin"}
        token = AuthSecurityManager.create_access_token(data=payload)
        token_data = AuthSecurityManager.verify_token(token)

        assert token_data.role == "super_admin"
