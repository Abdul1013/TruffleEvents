"""
Integration tests for Security Engine API endpoints using pytest.

Covers:
- Happy-path encrypt/validate round-trip
- Malformed JSON bodies (non-JSON content type)
- Missing/truncated IV in encrypted payload
- Incorrect AES key scenarios (wrong-key decrypt)
- Missing required fields (Pydantic 422)
"""

import base64
import os
import pytest
import httpx
from cryptography.exceptions import InvalidTag

from main import app
from crypto_service import CryptoService


@pytest.fixture
def client():
    """HTTPX test client for async testing."""
    return httpx.Client(app=app, base_url="http://test")


def test_health_check():
    """Test the /health endpoint."""
    with httpx.Client(app=app, base_url="http://test") as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_encrypt_endpoint():
    """Test the /encrypt endpoint."""
    with httpx.Client(app=app, base_url="http://test") as client:
        payload = {
            "ticket_id": "test-ticket-123",
            "user_id": "test-user-456"
        }
        
        response = client.post("/security/api/v1/encrypt", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["encrypted_qr"] is not None
        assert data["timestamp_ms"] is not None


def test_encrypt_missing_fields():
    """Test /encrypt with missing required fields."""
    with httpx.Client(app=app, base_url="http://test") as client:
        payload = {"ticket_id": "test"}  # Missing user_id
        
        response = client.post("/security/api/v1/encrypt", json=payload)
        assert response.status_code == 422  # Unprocessable Entity


def test_validate_endpoint():
    """Test the /validate endpoint with valid QR."""
    with httpx.Client(app=app, base_url="http://test") as client:
        # First, get an encrypted QR
        encrypt_payload = {
            "ticket_id": "test-ticket-123",
            "user_id": "test-user-456"
        }
        encrypt_response = client.post("/security/api/v1/encrypt", json=encrypt_payload)
        encrypted_qr = encrypt_response.json()["encrypted_qr"]
        
        # Now validate it
        validate_payload = {
            "encrypted_qr": encrypted_qr,
            "ttl_seconds": 30
        }
        response = client.post("/security/api/v1/validate", json=validate_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["ticket_id"] == "test-ticket-123"
        assert data["user_hash"] is not None
        assert data["timestamp_ms"] is not None


def test_validate_tampered_qr():
    """Test that tampered QR is rejected."""
    with httpx.Client(app=app, base_url="http://test") as client:
        tampered_qr = "YQ=="  # Invalid base64
        
        validate_payload = {
            "encrypted_qr": tampered_qr,
            "ttl_seconds": 30
        }
        response = client.post("/security/api/v1/validate", json=validate_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert "Invalid" in data["reason"]


def test_validate_missing_fields():
    """Test /validate with missing required fields."""
    with httpx.Client(app=app, base_url="http://test") as client:
        payload = {"ttl_seconds": 30}  # Missing encrypted_qr

        response = client.post("/security/api/v1/validate", json=payload)
        assert response.status_code == 422  # Unprocessable Entity


# ─── Malformed JSON hardening ────────────────────────────────────────────────

def test_encrypt_malformed_json_returns_422():
    """Sending raw text instead of JSON must return 422, not 500."""
    with httpx.Client(app=app, base_url="http://test") as client:
        response = client.post(
            "/security/api/v1/encrypt",
            content=b"this is not json at all!!!",
            headers={"Content-Type": "text/plain"},
        )
        # FastAPI returns 422 for unparseable body
        assert response.status_code == 422


def test_encrypt_empty_body_returns_422():
    """Sending an empty body must return 422."""
    with httpx.Client(app=app, base_url="http://test") as client:
        response = client.post(
            "/security/api/v1/encrypt",
            content=b"",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422


def test_validate_malformed_json_returns_422():
    """Sending raw text to /validate must return 422, not 500."""
    with httpx.Client(app=app, base_url="http://test") as client:
        response = client.post(
            "/security/api/v1/validate",
            content=b"<xml>not json</xml>",
            headers={"Content-Type": "text/plain"},
        )
        assert response.status_code == 422


# ─── Missing / truncated IV hardening ───────────────────────────────────────

def test_validate_payload_shorter_than_iv_returns_invalid():
    """A base64url payload that decodes to fewer than 12 bytes (IV size) must
    be rejected gracefully — not crash with an unhandled exception."""
    # 8 bytes encoded — shorter than a 12-byte GCM nonce
    short_bytes = base64.urlsafe_b64encode(b"\x00" * 8).decode().rstrip("=")
    with httpx.Client(app=app, base_url="http://test") as client:
        response = client.post(
            "/security/api/v1/validate",
            json={"encrypted_qr": short_bytes, "ttl_seconds": 30},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["reason"]  # must include a human-readable reason


def test_validate_iv_only_no_ciphertext_returns_invalid():
    """Exactly 12 bytes (IV only, no ciphertext or tag) must be rejected."""
    iv_only = base64.urlsafe_b64encode(os.urandom(12)).decode().rstrip("=")
    with httpx.Client(app=app, base_url="http://test") as client:
        response = client.post(
            "/security/api/v1/validate",
            json={"encrypted_qr": iv_only, "ttl_seconds": 30},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False


# ─── Incorrect AES key hardening ─────────────────────────────────────────────

def test_validate_payload_from_different_key_returns_invalid():
    """A QR payload encrypted with a different AES key must not validate."""
    foreign_service = CryptoService(encryption_key=os.urandom(32).hex())
    payload = foreign_service.generate_qr_payload(
        ticket_id="foreign-ticket", user_id="foreign-user"
    )
    foreign_qr = foreign_service.encrypt(payload)

    with httpx.Client(app=app, base_url="http://test") as client:
        response = client.post(
            "/security/api/v1/validate",
            json={"encrypted_qr": foreign_qr, "ttl_seconds": 30},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        # Reason must not leak internal exception details
        assert "InvalidTag" not in data.get("reason", "")


def test_validate_bit_flipped_ciphertext_returns_invalid():
    """A single-bit flip anywhere in the ciphertext must trigger InvalidTag
    and be returned as valid=False without crashing."""
    with httpx.Client(app=app, base_url="http://test") as client:
        # Produce a valid QR first
        enc_resp = client.post(
            "/security/api/v1/encrypt",
            json={"ticket_id": "flip-test", "user_id": "user-x"},
        )
        assert enc_resp.status_code == 200
        encrypted_qr: str = enc_resp.json()["encrypted_qr"]

        # Flip a character in the base64url string (middle of ciphertext region)
        chars = list(encrypted_qr)
        mid = len(chars) // 2
        chars[mid] = "X" if chars[mid] != "X" else "Y"
        tampered = "".join(chars)

        val_resp = client.post(
            "/security/api/v1/validate",
            json={"encrypted_qr": tampered, "ttl_seconds": 30},
        )
        assert val_resp.status_code == 200
        assert val_resp.json()["valid"] is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
