"""
Integration tests for Security Engine API endpoints using pytest.
"""

import pytest
import httpx
from main import app


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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
